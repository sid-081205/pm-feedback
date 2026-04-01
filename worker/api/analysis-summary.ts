import type { Env } from '../index';
import { json } from '../lib/db';

export async function handleAnalysisSummary(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  // ── Trends: always computed from raw feedback table ────────────────────────
  const trendsResult = await env.DB.prepare(`
    SELECT
      date(created_at) AS day,
      COUNT(*) AS total,
      SUM(CASE WHEN category='feature_request' THEN 1 ELSE 0 END) AS feature_request,
      SUM(CASE WHEN category='bug'             THEN 1 ELSE 0 END) AS bug,
      SUM(CASE WHEN category='praise'          THEN 1 ELSE 0 END) AS praise,
      SUM(CASE WHEN category='complaint'       THEN 1 ELSE 0 END) AS complaint,
      SUM(CASE WHEN category='question'        THEN 1 ELSE 0 END) AS question
    FROM feedback
    GROUP BY date(created_at)
    ORDER BY day ASC
    LIMIT 90
  `).all();

  const trends = (trendsResult.results as any[]).map((row) => ({
    day: row.day,
    total: row.total,
    feature_request: row.feature_request || 0,
    bug: row.bug || 0,
    praise: row.praise || 0,
    complaint: row.complaint || 0,
    question: row.question || 0,
    by_source: {},
  }));

  // ── Segments: always computed from raw feedback table ─────────────────────
  const segResult = await env.DB.prepare(`
    SELECT
      COALESCE(industry, 'unknown')            AS industry,
      COALESCE(company_size_bucket, 'unknown') AS size,
      COALESCE(plan_tier, 'unknown')           AS tier,
      COUNT(*) AS total,
      SUM(CASE WHEN category='feature_request' THEN 1 ELSE 0 END) AS feature_request,
      SUM(CASE WHEN category='bug'             THEN 1 ELSE 0 END) AS bug,
      SUM(CASE WHEN category='praise'          THEN 1 ELSE 0 END) AS praise,
      SUM(CASE WHEN category='complaint'       THEN 1 ELSE 0 END) AS complaint,
      SUM(CASE WHEN category='question'        THEN 1 ELSE 0 END) AS question
    FROM feedback
    GROUP BY industry, company_size_bucket, plan_tier
    ORDER BY total DESC
    LIMIT 10
  `).all();

  // Find the latest succeeded run to enrich segments with AI insights
  const latestRun = await env.DB.prepare(
    `SELECT id FROM analysis_runs WHERE status='succeeded' ORDER BY created_at DESC LIMIT 1`
  ).first() as any;

  const segments = await Promise.all((segResult.results as any[]).map(async (row) => {
    const segment_key = `industry=${row.industry}|size=${row.size}|tier=${row.tier}`;
    const by_category: Record<string, number> = {};
    for (const cat of ['feature_request', 'bug', 'praise', 'complaint', 'question']) {
      if (row[cat] > 0) by_category[cat] = row[cat];
    }

    // Enrich with AI-derived top insights if a run exists
    let top_insights: any[] = [];
    if (latestRun) {
      const enriched = await env.DB.prepare(
        `SELECT top_insights_json FROM segment_issue_metrics WHERE run_id=? AND segment_key=?`
      ).bind(latestRun.id, segment_key).first() as any;
      if (enriched) top_insights = JSON.parse(enriched.top_insights_json || '[]');
    }

    return { segment_key, top_insights, by_category, total: row.total };
  }));

  // ── Events + correlations: always computed from events table ───────────────
  const eventsResult = await env.DB.prepare(
    `SELECT * FROM events ORDER BY start_time DESC LIMIT 20`
  ).all();
  const events = eventsResult.results as any[];

  const correlations = await Promise.all(events.map(async (event) => {
    const windowEnd = event.end_time
      || new Date(new Date(event.start_time).getTime() + 86_400_000).toISOString();

    // Count feedback in the event window
    const windowRow = await env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN category='feature_request' THEN 1 ELSE 0 END) AS feature_request,
        SUM(CASE WHEN category='bug'             THEN 1 ELSE 0 END) AS bug,
        SUM(CASE WHEN category='complaint'       THEN 1 ELSE 0 END) AS complaint,
        SUM(CASE WHEN category='praise'          THEN 1 ELSE 0 END) AS praise
      FROM feedback
      WHERE created_at BETWEEN ? AND ?
    `).bind(event.start_time, windowEnd).first() as any;

    const feedbackInWindow = windowRow?.total || 0;

    // AI-generated insight correlations from the latest run (optional enrichment)
    let related_insights: any[] = [];
    let aiNotes: string | null = null;
    if (latestRun) {
      const aiCorr = await env.DB.prepare(
        `SELECT related_insights_json, notes FROM event_correlations WHERE run_id=? AND event_id=?`
      ).bind(latestRun.id, event.id).first() as any;
      if (aiCorr) {
        related_insights = JSON.parse(aiCorr.related_insights_json || '[]');
        aiNotes = aiCorr.notes;
      }
    }

    return {
      event: {
        id: event.id,
        type: event.type,
        title: event.title,
        description: event.description,
        start_time: event.start_time,
        end_time: event.end_time,
      },
      feedback_in_window: feedbackInWindow,
      window_breakdown: {
        feature_request: windowRow?.feature_request || 0,
        bug: windowRow?.bug || 0,
        complaint: windowRow?.complaint || 0,
        praise: windowRow?.praise || 0,
      },
      related_insights,
      notes: aiNotes || (feedbackInWindow > 0
        ? `${feedbackInWindow} feedback item(s) recorded during this event window`
        : 'No feedback recorded in this event window'),
    };
  }));

  return json({ runId: latestRun?.id ?? null, trends, segments, correlations });
}
