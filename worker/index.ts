import { handleFeedback } from './api/feedback';
import { handleInsights } from './api/insights';
import { handleAnalysisRuns } from './api/analysis-runs';
import { handleAnalysisSummary } from './api/analysis-summary';
import { handleAsk } from './api/ask';
import { handleAnalyzeDirect } from './api/analyze-direct';
import { AnalyzeWorkflow } from './workflows/analyze';

// Re-export Workflow so wrangler can bind it
export { AnalyzeWorkflow };

export interface Env {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  AI: Ai;
  ANALYZE_WORKFLOW: Workflow;
  ASSETS: Fetcher;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const path = url.pathname.slice(4); // strip /api prefix
      let response: Response;

      try {
        if (path.startsWith('/feedback'))           response = await handleFeedback(request, env, path);
        else if (path.startsWith('/insights'))      response = await handleInsights(request, env, path);
        else if (path.startsWith('/analysisRuns'))  response = await handleAnalysisRuns(request, env, path);
        else if (path === '/analysisSummary')       response = await handleAnalysisSummary(request, env, url);
        else if (path === '/ask')                   response = await handleAsk(request, env);
        else if (path === '/analyze/direct')        response = await handleAnalyzeDirect(request, env);
        else response = new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        console.error('API error:', err);
        response = new Response(JSON.stringify({ error: 'Internal server error', detail: String(err?.message || err) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Attach CORS to every API response
      const headers = new Headers(response.headers);
      Object.entries(CORS).forEach(([k, v]) => headers.set(k, v));
      return new Response(response.body, { status: response.status, headers });
    }

    // All other requests → static assets (React SPA)
    return env.ASSETS.fetch(request);
  },
};
