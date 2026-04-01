-- Core feedback items
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  text TEXT NOT NULL,
  author TEXT,
  created_at TEXT NOT NULL,
  category TEXT,
  sentiment_label TEXT,
  sentiment_score REAL,
  company_size_bucket TEXT,
  industry TEXT,
  plan_tier TEXT,
  company_stage TEXT,
  region TEXT,
  metadata_json TEXT DEFAULT '{}'
);

-- Vectorize linkage
CREATE TABLE IF NOT EXISTS feedback_embeddings (
  feedback_id TEXT PRIMARY KEY REFERENCES feedback(id),
  vector_id TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Analysis runs (workflow state tracking)
CREATE TABLE IF NOT EXISTS analysis_runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'queued',
  prompt TEXT,
  filters_json TEXT DEFAULT '{}',
  insight_count INTEGER DEFAULT 10,
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  error TEXT
);

-- AI-derived insights
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  urgency_score INTEGER,
  value_score INTEGER,
  sentiment_score REAL,
  sentiment_label TEXT,
  topics_json TEXT DEFAULT '[]',
  urgency_factors_json TEXT DEFAULT '{}',
  value_factors_json TEXT DEFAULT '{}',
  trend_json TEXT DEFAULT '[]',
  run_id TEXT REFERENCES analysis_runs(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Feedback <-> Insight link table
CREATE TABLE IF NOT EXISTS insight_feedback (
  insight_id TEXT REFERENCES insights(id),
  feedback_id TEXT REFERENCES feedback(id),
  weight REAL DEFAULT 1.0,
  PRIMARY KEY (insight_id, feedback_id)
);

-- Events (manual/seeded; schema-flexible for future API ingestion)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  source TEXT DEFAULT 'manual',
  external_ref TEXT
);

-- Event correlation output per run
CREATE TABLE IF NOT EXISTS event_correlations (
  run_id TEXT REFERENCES analysis_runs(id),
  event_id TEXT REFERENCES events(id),
  related_insights_json TEXT DEFAULT '[]',
  notes TEXT,
  PRIMARY KEY (run_id, event_id)
);

-- Pre-aggregated daily trend data
CREATE TABLE IF NOT EXISTS daily_feedback_metrics (
  day TEXT NOT NULL,
  run_id TEXT REFERENCES analysis_runs(id),
  total_count INTEGER DEFAULT 0,
  by_category_json TEXT DEFAULT '{}',
  by_source_json TEXT DEFAULT '{}',
  PRIMARY KEY (day, run_id)
);

-- Pre-aggregated segment breakdown
CREATE TABLE IF NOT EXISTS segment_issue_metrics (
  run_id TEXT REFERENCES analysis_runs(id),
  segment_key TEXT NOT NULL,
  top_insights_json TEXT DEFAULT '[]',
  by_category_json TEXT DEFAULT '{}',
  PRIMARY KEY (run_id, segment_key)
);

CREATE INDEX IF NOT EXISTS idx_feedback_source ON feedback(source);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_insights_run_id ON insights(run_id);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_status ON analysis_runs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_created_at ON analysis_runs(created_at);
