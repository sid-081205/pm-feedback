import type { Env } from '../index';
import { json, mapFeedback, type FeedbackRow } from '../lib/db';
import { semanticSearch } from '../lib/vectorize';
import { LLM_MODEL } from '../lib/ai';

export async function handleAsk(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { prompt, filters = {} } = body;
  if (!prompt) return json({ error: 'prompt is required' }, 400);

  // 1. Semantic retrieval via Vectorize
  let feedbackIds: string[] = [];
  try {
    feedbackIds = await semanticSearch(env.AI, env.VECTORIZE, prompt, 15);
  } catch (_) {
    // Vectorize not available (local dev) — fall back to keyword search
  }

  let relevantFeedback: ReturnType<typeof mapFeedback>[] = [];

  if (feedbackIds.length > 0) {
    const placeholders = feedbackIds.map(() => '?').join(',');
    const result = await env.DB.prepare(
      `SELECT * FROM feedback WHERE id IN (${placeholders})`
    ).bind(...feedbackIds).all();
    relevantFeedback = (result.results as unknown as FeedbackRow[]).map(mapFeedback);
  }

  // Keyword fallback — also used when semantic search returned no results
  if (relevantFeedback.length === 0) {
    const terms = prompt.split(/\s+/).filter((t: string) => t.length > 3).slice(0, 5);
    if (terms.length > 0) {
      const likeClause = terms.map(() => 'text LIKE ?').join(' OR ');
      const result = await env.DB.prepare(
        `SELECT * FROM feedback WHERE ${likeClause} LIMIT 15`
      ).bind(...terms.map((t: string) => `%${t}%`)).all();
      relevantFeedback = (result.results as unknown as FeedbackRow[]).map(mapFeedback);
    }
  }

  // Last resort — use most recent feedback so the LLM always has context
  if (relevantFeedback.length === 0) {
    const result = await env.DB.prepare(
      `SELECT * FROM feedback ORDER BY created_at DESC LIMIT 15`
    ).all();
    relevantFeedback = (result.results as unknown as FeedbackRow[]).map(mapFeedback);
  }

  if (relevantFeedback.length === 0) {
    return json({ answer: 'No feedback data found. Add some feedback first.', sources: [] });
  }

  // 2. Call LLM with retrieved context
  const context = relevantFeedback
    .map((f) => `[${f.source}] "${f.text}" — ${f.author}`)
    .join('\n');

  const result = await env.AI.run(LLM_MODEL as any, {
    messages: [
      {
        role: 'system',
        content:
          'You are a product analyst assistant. Answer the question concisely using only the feedback context provided. Be direct and specific. 2–4 sentences max.',
      },
      {
        role: 'user',
        content: `Question: ${prompt}\n\nFeedback context:\n${context}`,
      },
    ],
    max_tokens: 512,
  } as any) as any;

  return json({
    answer: result.response as string,
    sources: relevantFeedback.slice(0, 5),
  });
}
