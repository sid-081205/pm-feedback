import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env } from '../index';
import { type FeedbackRow } from '../lib/db';
import { extractInsights } from '../lib/ai';

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

      // Step 2: Load run parameters + query a compact feedback sample
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

        const limit = Math.max(40, Math.min((run?.insight_count || 10) * 12, 120));
        q += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);
        const result = await this.env.DB.prepare(q).bind(...params).all();
        return result.results as unknown as FeedbackRow[];
      });

      if (candidates.length === 0) {
        await this.env.DB.prepare(
          `UPDATE analysis_runs SET status='succeeded', finished_at=?, error='No feedback matched filters' WHERE id=?`
        ).bind(new Date().toISOString(), runId).run();
        return;
      }

      // Step 3: Build compact DB summaries and send them to Workers AI
      const run = await this.env.DB.prepare(
        'SELECT prompt, insight_count FROM analysis_runs WHERE id=?'
      ).bind(runId).first() as any;

      const [categorySummary, sourceSummary] = await Promise.all([
        this.env.DB.prepare(
          `SELECT category, COUNT(*) AS count
           FROM feedback
           WHERE 1=1${candidates.length ? ` AND id IN (${candidates.map(() => '?').join(',')})` : ''}
           GROUP BY category
           ORDER BY count DESC`
        ).bind(...candidates.map((f) => f.id)).all(),
        this.env.DB.prepare(
          `SELECT source, COUNT(*) AS count
           FROM feedback
           WHERE 1=1${candidates.length ? ` AND id IN (${candidates.map(() => '?').join(',')})` : ''}
           GROUP BY source
           ORDER BY count DESC`
        ).bind(...candidates.map((f) => f.id)).all(),
      ]);

      const promptContext = {
        user_prompt: run?.prompt || 'Analyze product feedback themes',
        requested_insights: run?.insight_count || 10,
        totals: {
          feedback_items: candidates.length,
          categories: (categorySummary.results as any[]).map((row) => ({ category: row.category, count: row.count })),
          sources: (sourceSummary.results as any[]).map((row) => ({ source: row.source, count: row.count })),
        },
        feedback: candidates.map((f) => ({
          id: f.id,
          source: f.source,
          category: f.category,
          author: f.author,
          created_at: f.created_at,
          text: f.text,
        })),
      };

      const insights = await step.do('extract-insights', async () => {
        return extractInsights(
          this.env.AI,
          candidates.map((f) => ({ id: f.id, source: f.source, text: f.text })),
          JSON.stringify(promptContext),
          run?.insight_count || 10
        );
      });

      // Step 4: Write insights + links to D1
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

      // Step 5: Mark succeeded
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
