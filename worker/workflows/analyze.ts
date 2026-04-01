import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env } from '../index';
import { type FeedbackRow } from '../lib/db';
import { extractInsights } from '../lib/ai';
import { upsertFeedbackVectors } from '../lib/vectorize';

interface WorkflowParams {
  runId: string;
}

export class AnalyzeWorkflow extends WorkflowEntrypoint<Env, WorkflowParams> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep): Promise<void> {
    const { runId } = event.payload;

    try {
      // Step 1: Mark running
      await step.do('mark-running', async () => {
        await this.env.DB.prepare(
          `UPDATE analysis_runs SET status='running', started_at=? WHERE id=?`
        ).bind(new Date().toISOString(), runId).run();
      });

      // Step 2: Load run parameters + query candidate feedback
      const candidates = await step.do('query-feedback', async (): Promise<FeedbackRow[]> => {
        const run = await this.env.DB.prepare(
          'SELECT * FROM analysis_runs WHERE id=?'
        ).bind(runId).first() as any;

        const filters = JSON.parse(run?.filters_json || '{}');
        let q = 'SELECT * FROM feedback WHERE 1=1';
        const params: (string | number)[] = [];

        if (filters.sources?.length) {
          q += ` AND source IN (${filters.sources.map(() => '?').join(',')})`;
          params.push(...filters.sources);
        }
        if (filters.category) { q += ' AND category = ?'; params.push(filters.category); }
        if (filters.since)    { q += ' AND created_at >= ?'; params.push(filters.since); }
        if (filters.until)    { q += ' AND created_at <= ?'; params.push(filters.until); }

        q += ' ORDER BY created_at DESC LIMIT 500';
        const result = await this.env.DB.prepare(q).bind(...params).all();
        return result.results as unknown as FeedbackRow[];
      });

      if (candidates.length === 0) {
        await this.env.DB.prepare(
          `UPDATE analysis_runs SET status='succeeded', finished_at=?, error='No feedback matched filters' WHERE id=?`
        ).bind(new Date().toISOString(), runId).run();
        return;
      }

      // Step 3: Upsert embeddings into Vectorize
      await step.do('upsert-vectors', async () => {
        await upsertFeedbackVectors(
          this.env.AI,
          this.env.VECTORIZE,
          this.env.DB,
          candidates.map((f) => ({ id: f.id, source: f.source, category: f.category, text: f.text }))
        );
      });

      // Step 4: Extract themes + scores via Workers AI
      const run = await this.env.DB.prepare(
        'SELECT prompt, insight_count FROM analysis_runs WHERE id=?'
      ).bind(runId).first() as any;

      const insights = await step.do('extract-insights', async () => {
        return extractInsights(
          this.env.AI,
          candidates.map((f) => ({ id: f.id, source: f.source, text: f.text })),
          run?.prompt || 'Analyze product feedback themes',
          run?.insight_count || 10
        );
      });

      // Step 5: Write insights + links to D1
      await step.do('write-insights', async () => {
        const now = new Date().toISOString();
        const stmts: D1PreparedStatement[] = [];

        for (const insight of insights) {
          const id = crypto.randomUUID();

          stmts.push(
            this.env.DB.prepare(
              `INSERT OR REPLACE INTO insights
               (id,title,category,urgency_score,value_score,sentiment_score,sentiment_label,
                topics_json,urgency_factors_json,value_factors_json,trend_json,run_id,created_at,updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
            ).bind(
              id, insight.title, insight.category,
              insight.urgency_score, insight.value_score,
              insight.sentiment_score, insight.sentiment_label,
              JSON.stringify(insight.topics),
              JSON.stringify(insight.urgency_factors),
              JSON.stringify(insight.value_factors),
              JSON.stringify([]), // trend computed separately
              runId, now, now
            )
          );

          for (const feedbackId of (insight.related_feedback_ids || [])) {
            stmts.push(
              this.env.DB.prepare(
                'INSERT OR IGNORE INTO insight_feedback (insight_id, feedback_id) VALUES (?,?)'
              ).bind(id, feedbackId)
            );
          }
        }

        if (stmts.length > 0) await this.env.DB.batch(stmts);
      });

      // Step 6: Compute daily_feedback_metrics
      await step.do('compute-metrics', async () => {
        // Aggregate feedback by day from candidates
        const dayMap = new Map<string, { total: number; byCategory: Record<string, number>; bySource: Record<string, number> }>();

        for (const f of candidates) {
          const day = f.created_at.split('T')[0];
          if (!dayMap.has(day)) dayMap.set(day, { total: 0, byCategory: {}, bySource: {} });
          const entry = dayMap.get(day)!;
          entry.total++;
          if (f.category) entry.byCategory[f.category] = (entry.byCategory[f.category] || 0) + 1;
          if (f.source) entry.bySource[f.source] = (entry.bySource[f.source] || 0) + 1;
        }

        const stmts: D1PreparedStatement[] = [];
        for (const [day, data] of dayMap) {
          stmts.push(
            this.env.DB.prepare(
              `INSERT OR REPLACE INTO daily_feedback_metrics (day,run_id,total_count,by_category_json,by_source_json)
               VALUES (?,?,?,?,?)`
            ).bind(day, runId, data.total, JSON.stringify(data.byCategory), JSON.stringify(data.bySource))
          );
        }
        if (stmts.length > 0) await this.env.DB.batch(stmts);
      });

      // Step 7: Compute segment metrics
      await step.do('compute-segments', async () => {
        // Group candidates by segment key
        const segMap = new Map<string, { byCategory: Record<string, number>; insightCounts: Record<string, number> }>();

        for (const f of candidates) {
          const industry = f.industry || 'unknown';
          const size = f.company_size_bucket || 'unknown';
          const tier = f.plan_tier || 'unknown';
          const key = `industry=${industry}|size=${size}|tier=${tier}`;

          if (!segMap.has(key)) segMap.set(key, { byCategory: {}, insightCounts: {} });
          const entry = segMap.get(key)!;
          if (f.category) entry.byCategory[f.category] = (entry.byCategory[f.category] || 0) + 1;
        }

        const stmts: D1PreparedStatement[] = [];
        for (const [key, data] of segMap) {
          const topInsights = Object.entries(data.insightCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([id, count]) => ({ id, count }));

          stmts.push(
            this.env.DB.prepare(
              `INSERT OR REPLACE INTO segment_issue_metrics (run_id,segment_key,top_insights_json,by_category_json)
               VALUES (?,?,?,?)`
            ).bind(runId, key, JSON.stringify(topInsights), JSON.stringify(data.byCategory))
          );
        }
        if (stmts.length > 0) await this.env.DB.batch(stmts);
      });

      // Step 8: Correlate with events
      await step.do('correlate-events', async () => {
        const eventsResult = await this.env.DB.prepare('SELECT * FROM events ORDER BY start_time DESC LIMIT 20').all();
        const events = eventsResult.results as any[];
        if (events.length === 0) return;

        // Get newly-created insights for this run
        const insightsResult = await this.env.DB.prepare(
          'SELECT id, title FROM insights WHERE run_id=?'
        ).bind(runId).all();
        const runInsights = insightsResult.results as any[];

        const stmts: D1PreparedStatement[] = [];
        for (const event of events) {
          const windowStart = event.start_time;
          const windowEnd = event.end_time || new Date(new Date(windowStart).getTime() + 86400000).toISOString();

          // Count feedback in event window
          const countResult = await this.env.DB.prepare(
            'SELECT COUNT(*) as cnt FROM feedback WHERE created_at BETWEEN ? AND ?'
          ).bind(windowStart, windowEnd).first() as any;

          const windowCount = countResult?.cnt || 0;
          if (windowCount === 0) continue;

          // Simple correlation: include insights that have feedback in the event window
          const relatedInsights = [];
          for (const ins of runInsights.slice(0, 3)) {
            const linkCount = await this.env.DB.prepare(
              `SELECT COUNT(*) as cnt FROM insight_feedback lnk
               JOIN feedback f ON f.id=lnk.feedback_id
               WHERE lnk.insight_id=? AND f.created_at BETWEEN ? AND ?`
            ).bind(ins.id, windowStart, windowEnd).first() as any;

            if ((linkCount?.cnt || 0) > 0) {
              relatedInsights.push({ id: ins.id, title: ins.title, count: linkCount.cnt });
            }
          }

          if (relatedInsights.length > 0) {
            stmts.push(
              this.env.DB.prepare(
                `INSERT OR REPLACE INTO event_correlations (run_id,event_id,related_insights_json,notes)
                 VALUES (?,?,?,?)`
              ).bind(
                runId, event.id,
                JSON.stringify(relatedInsights),
                `${windowCount} feedback item(s) in event window`
              )
            );
          }
        }
        if (stmts.length > 0) await this.env.DB.batch(stmts);
      });

      // Step 9: Mark succeeded
      await step.do('mark-succeeded', async () => {
        await this.env.DB.prepare(
          `UPDATE analysis_runs SET status='succeeded', finished_at=? WHERE id=?`
        ).bind(new Date().toISOString(), runId).run();
      });

    } catch (err: any) {
      await this.env.DB.prepare(
        `UPDATE analysis_runs SET status='failed', finished_at=?, error=? WHERE id=?`
      ).bind(new Date().toISOString(), String(err?.message || err), runId).run();
      throw err;
    }
  }
}
