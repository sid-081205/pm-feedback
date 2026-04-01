// Typed row shapes matching D1 schema
export interface FeedbackRow {
  id: string;
  source: string;
  text: string;
  author: string;
  created_at: string;
  category: string;
  sentiment_label: string | null;
  sentiment_score: number | null;
  company_size_bucket: string | null;
  industry: string | null;
  plan_tier: string | null;
  company_stage: string | null;
  region: string | null;
  metadata_json: string;
}

export interface InsightRow {
  id: string;
  title: string;
  category: string;
  urgency_score: number | null;
  value_score: number | null;
  sentiment_score: number | null;
  sentiment_label: string | null;
  topics_json: string;
  urgency_factors_json: string;
  value_factors_json: string;
  trend_json: string;
  run_id: string | null;
  created_at: string;
  updated_at: string;
  // Aggregated via JOIN
  mention_count?: number;
  sources_csv?: string;
  feedback_ids_csv?: string;
}

export interface AnalysisRunRow {
  id: string;
  status: string;
  prompt: string | null;
  filters_json: string;
  insight_count: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
}

// Map a D1 InsightRow to the API response shape expected by the frontend
export function mapInsight(row: InsightRow) {
  const sources = row.sources_csv
    ? [...new Set(row.sources_csv.split(',').filter(Boolean))]
    : [];
  const feedbackIds = row.feedback_ids_csv
    ? [...new Set(row.feedback_ids_csv.split(',').filter(Boolean))]
    : [];
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    urgency_score: row.urgency_score ?? 0,
    value_score: row.value_score ?? 0,
    sentimentScore: row.sentiment_score ?? 0,
    sentiment_label: row.sentiment_label ?? 'neutral',
    topics: JSON.parse(row.topics_json || '[]'),
    urgency_factors: JSON.parse(row.urgency_factors_json || '{}'),
    value_factors: JSON.parse(row.value_factors_json || '{}'),
    trend: JSON.parse(row.trend_json || '[]'),
    mentions: row.mention_count ?? 0,
    sources,
    feedbackIds,
    run_id: row.run_id,
    created_at: row.created_at,
  };
}

export function mapFeedback(row: FeedbackRow) {
  return {
    id: row.id,
    source: row.source,
    text: row.text,
    author: row.author,
    date: row.created_at.split('T')[0],
    category: row.category,
    sentiment: row.sentiment_label ?? 'neutral',
    sentiment_score: row.sentiment_score,
    company_size_bucket: row.company_size_bucket,
    industry: row.industry,
    plan_tier: row.plan_tier,
    company_stage: row.company_stage,
    region: row.region,
  };
}

// Base query for insights with aggregated feedback data
export const INSIGHTS_SELECT = `
  SELECT
    i.*,
    COUNT(DISTINCT lnk.feedback_id) AS mention_count,
    GROUP_CONCAT(DISTINCT f.source) AS sources_csv,
    GROUP_CONCAT(DISTINCT lnk.feedback_id) AS feedback_ids_csv
  FROM insights i
  LEFT JOIN insight_feedback lnk ON lnk.insight_id = i.id
  LEFT JOIN feedback f ON f.id = lnk.feedback_id
`;

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
