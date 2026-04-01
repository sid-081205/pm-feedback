import type { Env } from '../index';
import { mapFeedback, type FeedbackRow } from '../lib/db';
import { LLM_MODEL } from '../lib/ai';

function sseEvent(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function handleAnalyzeDirect(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { prompt, insightCount = 10 } = body;
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'prompt is required' }), { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(sseEvent(data));

      try {
        // Step 0 — start
        send({ step: 0, label: 'Connecting to D1 database…' });

        // Step 1 — fetch feedback (real async work)
        const feedbackResult = await env.DB.prepare(
          `SELECT * FROM feedback ORDER BY created_at DESC LIMIT 120`
        ).all();
        const feedbackItems = (feedbackResult.results as unknown as FeedbackRow[]).map(mapFeedback);

        if (feedbackItems.length === 0) {
          send({ error: 'No feedback data found. Add some feedback first.' });
          controller.close();
          return;
        }

        send({ step: 1, label: `Fetched ${feedbackItems.length} feedback items from D1` });

        // Step 2 — call Workers AI (real async work, can take 10-30s)
        const feedbackContext = feedbackItems
          .map((f, i) => `${i + 1}. [${f.source}] [${f.category}] "${f.text}" — ${f.author}`)
          .join('\n');

        send({ step: 2, label: `Sending ${feedbackItems.length} items to Workers AI…` });

        const aiResult = await env.AI.run(LLM_MODEL as any, {
          messages: [
            {
              role: 'system',
              content: `You are a senior product manager extracting actionable insights from customer feedback.
Return ONLY valid JSON — no markdown, no prose — in this exact shape:
{
  "insights": [
    {
      "title": "string (5-10 word actionable insight title)",
      "category": "feature_request"|"bug"|"praise"|"complaint"|"question",
      "urgency_score": number (0-100),
      "value_score": number (0-100),
      "sentiment_label": "positive"|"negative"|"neutral"|"mixed",
      "topics": [{"label": "string", "count": number}],
      "feedback_indices": [number]
    }
  ]
}
Rules:
- Generate exactly ${insightCount} distinct insights
- Focus on: ${prompt}
- urgency_score: how urgently this needs addressing (100=critical/blocking, 0=nice-to-have)
- value_score: business value of addressing this (100=highest, 0=minimal)
- feedback_indices: 1-based indices of feedback items supporting each insight`,
            },
            {
              role: 'user',
              content: `Analyze this feedback (${feedbackItems.length} items) and extract ${insightCount} insights:\n\n${feedbackContext}`,
            },
          ],
          max_tokens: 3000,
        } as any) as any;

        // Step 3 — parse AI response (real work done)
        send({ step: 3, label: 'Parsing AI response…' });

        let parsedInsights: any[] = [];
        try {
          const raw = (aiResult.response as string).trim();
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            parsedInsights = Array.isArray(parsed.insights) ? parsed.insights : [];
          }
        } catch (_) {}

        if (parsedInsights.length === 0) {
          send({ error: 'AI returned no insights. Try rephrasing your prompt.' });
          controller.close();
          return;
        }

        // Step 4 — write to D1 (real async work)
        send({ step: 4, label: `Writing ${parsedInsights.length} insights to database…` });

        const runId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO analysis_runs (id,status,prompt,filters_json,insight_count,created_at,started_at,finished_at)
           VALUES (?,?,?,?,?,?,?,?)`
        ).bind(runId, 'succeeded', prompt, '{}', parsedInsights.length, now, now, now).run();

        const insightRows: Array<{ id: string; feedbackIndices: number[] }> = [];
        const insertStmts = parsedInsights.map((ins: any) => {
          const id = crypto.randomUUID();
          insightRows.push({ id, feedbackIndices: ins.feedback_indices || [] });
          return env.DB.prepare(
            `INSERT INTO insights (id,title,category,urgency_score,value_score,sentiment_label,sentiment_score,topics_json,urgency_factors_json,value_factors_json,trend_json,run_id,created_at,updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
          ).bind(
            id, ins.title, ins.category,
            Math.min(100, Math.max(0, ins.urgency_score || 50)),
            Math.min(100, Math.max(0, ins.value_score || 50)),
            ins.sentiment_label || 'neutral', 0,
            JSON.stringify(ins.topics || []),
            '{}', '{}', '[]', runId, now, now
          );
        });

        if (insertStmts.length > 0) await env.DB.batch(insertStmts);

        // Link insights to feedback
        const linkStmts: any[] = [];
        for (const { id: insightId, feedbackIndices } of insightRows) {
          for (const idx of feedbackIndices) {
            const fb = feedbackItems[idx - 1];
            if (fb) {
              linkStmts.push(
                env.DB.prepare(
                  `INSERT OR IGNORE INTO insight_feedback (insight_id, feedback_id) VALUES (?, ?)`
                ).bind(insightId, fb.id)
              );
            }
          }
        }
        if (linkStmts.length > 0) await env.DB.batch(linkStmts);

        // Step 5 — done
        send({
          step: 5,
          label: `Done — ${parsedInsights.length} insights saved`,
          done: true,
          runId,
          insightsCount: parsedInsights.length,
        });

      } catch (err: any) {
        send({ error: String(err?.message || err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
