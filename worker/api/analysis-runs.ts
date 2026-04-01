import type { Env } from '../index';
import { json, type AnalysisRunRow } from '../lib/db';

export async function handleAnalysisRuns(request: Request, env: Env, path: string): Promise<Response> {

  // GET /analysisRuns/:id
  const detailMatch = path.match(/^\/analysisRuns\/([^/]+)$/);
  if (request.method === 'GET' && detailMatch) {
    const id = detailMatch[1];
    const run = await env.DB.prepare('SELECT * FROM analysis_runs WHERE id = ?').bind(id).first() as AnalysisRunRow | null;
    if (!run) return json({ error: 'Not found' }, 404);

    const counts = await env.DB.prepare(
      'SELECT COUNT(*) as insight_count FROM insights WHERE run_id = ?'
    ).bind(id).first() as any;

    return json({
      runId: run.id,
      status: run.status,
      prompt: run.prompt,
      filters: JSON.parse(run.filters_json || '{}'),
      insightCount: run.insight_count,
      insightsProduced: counts?.insight_count ?? 0,
      createdAt: run.created_at,
      startedAt: run.started_at,
      finishedAt: run.finished_at,
      error: run.error,
    });
  }

  // POST /analysisRuns
  if (request.method === 'POST' && (path === '/analysisRuns' || path === '/analysisRuns/')) {
    let body: any;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { prompt, filters = {}, insightCount = 10 } = body;
    if (!prompt) return json({ error: 'prompt is required' }, 400);

    const runId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await env.DB.prepare(
        `INSERT INTO analysis_runs (id,status,prompt,filters_json,insight_count,created_at) VALUES (?,?,?,?,?,?)`
      ).bind(runId, 'queued', prompt, JSON.stringify(filters), insightCount, now).run();
    } catch (err: any) {
      const detail = String(err?.message || err);
      if (detail.includes('no such table')) {
        return json({
          error: 'Database schema not found. Please contact support.',
          detail,
        }, 500);
      }
      return json({ error: 'Failed to create analysis run', detail }, 500);
    }

    try {
      await env.ANALYZE_WORKFLOW.create({ id: runId, params: { runId } });
    } catch (err: any) {
      // Mark failed immediately if workflow can't start, but still return the runId
      // so the client can see the failed status via polling
      await env.DB.prepare(
        `UPDATE analysis_runs SET status='failed', error=?, finished_at=? WHERE id=?`
      ).bind(String(err?.message || err), new Date().toISOString(), runId).run();
      return json({
        error: 'Workflow failed to start',
        detail: String(err?.message || err),
        runId,
      }, 500);
    }

    return json({ runId }, 202);
  }

  // GET /analysisRuns
  if (request.method === 'GET' && (path === '/analysisRuns' || path === '/analysisRuns/')) {
    const result = await env.DB.prepare(
      'SELECT * FROM analysis_runs ORDER BY created_at DESC LIMIT 20'
    ).all();
    return json({ runs: result.results });
  }

  return json({ error: 'Not found' }, 404);
}
