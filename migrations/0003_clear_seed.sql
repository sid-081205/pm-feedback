-- Clear all seeded data so the app starts with an empty database
DELETE FROM event_correlations;
DELETE FROM segment_issue_metrics;
DELETE FROM daily_feedback_metrics;
DELETE FROM insight_feedback;
DELETE FROM insights;
DELETE FROM feedback_embeddings;
DELETE FROM feedback;
DELETE FROM analysis_runs;
DELETE FROM events;
