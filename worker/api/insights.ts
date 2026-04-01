import type { Env } from '../index';
import { json, mapInsight, mapFeedback, INSIGHTS_SELECT, type InsightRow, type FeedbackRow } from '../lib/db';
import { LLM_MODEL } from '../lib/ai';

export async function handleInsights(request: Request, env: Env, path: string): Promise<Response> {
  const url = new URL(request.url);

  // POST /insights/:id/survey — generate survey questions with Workers AI
  const surveyMatch = path.match(/^\/insights\/([^/]+)\/survey$/);
  if (request.method === 'POST' && surveyMatch) {
    const id = surveyMatch[1];

    const row = await env.DB.prepare(
      `${INSIGHTS_SELECT} WHERE i.id = ? GROUP BY i.id`
    ).bind(id).first() as InsightRow | null;
    if (!row) return json({ error: 'Not found' }, 404);

    const feedbackResult = await env.DB.prepare(
      `SELECT f.text, f.source, f.author FROM feedback f
       JOIN insight_feedback lnk ON lnk.feedback_id = f.id
       WHERE lnk.insight_id = ? LIMIT 10`
    ).bind(id).all();

    const topics = JSON.parse(row.topics_json || '[]').map((t: any) => t.label).join(', ');
    const feedbackSamples = (feedbackResult.results as any[])
      .map((f) => `[${f.source}] "${f.text}"`)
      .join('\n---\n');

    const result = await env.AI.run(LLM_MODEL as any, {
      messages: [
        {
          role: 'system',
          content: `You are a senior product researcher at Cloudflare. Generate a concise product survey to gather structured data about a feedback theme.
Return ONLY valid JSON in this exact shape, no prose:
{
  "title": "string",
  "description": "string (1-2 sentences explaining the survey goal)",
  "questions": [
    {
      "id": 1,
      "type": "rating"|"multiple_choice"|"open_text",
      "question": "string",
      "options": ["string"] or null,
      "rationale": "string (why this question matters)"
    }
  ]
}
Rules:
- 6-8 questions total
- Mix of types: 2 rating (1-5 scale), 2-3 multiple choice, 2 open text
- Questions must be directly informed by the insight topics and feedback
- Keep questions concise and unambiguous
- For rating questions, options should be null
- For multiple_choice, provide 4-5 specific options based on the actual feedback content`,
        },
        {
          role: 'user',
          content: `Insight: "${row.title}"
Category: ${row.category}
Topics: ${topics}
Urgency score: ${row.urgency_score ?? 'N/A'}, Value score: ${row.value_score ?? 'N/A'}

Sample feedback:
${feedbackSamples}`,
        },
      ],
      max_tokens: 2048,
    } as any) as any;

    try {
      const raw = (result.response as string).trim();
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return json(JSON.parse(match[0]));
    } catch (_) {}

    return json({ error: 'Failed to generate survey' }, 500);
  }

  // GET /insights/:id  — detail with expanded feedback
  const detailMatch = path.match(/^\/insights\/([^/]+)$/);
  if (request.method === 'GET' && detailMatch) {
    const id = detailMatch[1];

    const row = await env.DB.prepare(
      `${INSIGHTS_SELECT} WHERE i.id = ? GROUP BY i.id`
    ).bind(id).first() as InsightRow | null;

    if (!row) return json({ error: 'Not found' }, 404);

    const insight = mapInsight(row);

    const feedbackResult = await env.DB.prepare(
      `SELECT f.* FROM feedback f
       JOIN insight_feedback lnk ON lnk.feedback_id = f.id
       WHERE lnk.insight_id = ?`
    ).bind(id).all();
    const feedback = (feedbackResult.results as unknown as FeedbackRow[]).map(mapFeedback);

    return json({ insight, feedback });
  }

  // GET /insights
  if (request.method === 'GET' && (path === '/insights' || path === '/insights/')) {
    const search = url.searchParams.get('search') || '';
    const source = url.searchParams.get('source') || '';
    const category = url.searchParams.get('category') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const cursor = url.searchParams.get('cursor') || '';

    let q = `${INSIGHTS_SELECT} WHERE 1=1`;
    const params: (string | number)[] = [];

    if (search) {
      q += ' AND (i.title LIKE ? OR i.topics_json LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) { q += ' AND i.category = ?'; params.push(category); }
    if (source) {
      q += ' AND EXISTS (SELECT 1 FROM insight_feedback lnk2 JOIN feedback f2 ON f2.id=lnk2.feedback_id WHERE lnk2.insight_id=i.id AND f2.source=?)';
      params.push(source);
    }
    if (cursor) { q += ' AND i.created_at < ?'; params.push(cursor); }

    q += ` GROUP BY i.id ORDER BY i.urgency_score DESC, i.created_at DESC LIMIT ?`;
    params.push(limit + 1);

    const result = await env.DB.prepare(q).bind(...params).all();
    const rows = result.results as unknown as InsightRow[];
    const hasMore = rows.length > limit;
    const insights = rows.slice(0, limit).map(mapInsight);
    const nextCursor = hasMore ? rows[limit - 1].created_at : null;

    return json({ insights, hasMore, nextCursor });
  }

  return json({ error: 'Not found' }, 404);
}
