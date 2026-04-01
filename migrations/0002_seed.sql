-- ============================================================
-- Seed: Feedback items (from mock-data.ts)
-- ============================================================
INSERT OR IGNORE INTO feedback (id,source,text,author,created_at,category,sentiment_label,sentiment_score,company_size_bucket,industry,plan_tier,company_stage,region) VALUES
('f1','community','The Cloudflare dashboard is painfully slow when switching between zones. It takes 3-4 seconds just to load the DNS page. This is a significant productivity killer when managing 50+ domains.','netadmin_pro','2026-03-28T10:00:00Z','complaint','negative',-0.7,'1000+','it_ops','enterprise','growth','US'),
('f2','discord','Dashboard performance has gotten worse after the last update. Page transitions feel sluggish.','devops_sarah','2026-03-27T14:30:00Z','bug','negative',-0.6,'201-1000','saas','pro','growth','US'),
('f3','github','Can we get a keyboard shortcut to quickly switch between zones in the dashboard? That would speed things up.','keybind_king','2026-03-30T09:15:00Z','feature_request','neutral',0.0,'11-50','saas','free','early','EU'),
('f4','github','Workers DX is great but I really wish wrangler had better TypeScript support out of the box. The types for env bindings are always wrong.','ts_wizard','2026-03-29T11:00:00Z','feature_request','mixed',-0.2,'11-50','saas','free','early','US'),
('f5','x','Deploying Workers is a breeze compared to other edge platforms. Keep it up!','edge_dev','2026-03-26T08:45:00Z','praise','positive',0.9,'1-10','saas','free','early','US'),
('f6','github','wrangler dev keeps crashing with the new D1 bindings. Can''t reproduce locally at all.','d1_beta_user','2026-03-31T16:20:00Z','bug','negative',-0.7,'11-50','saas','pro','early','US'),
('f7','support','DNS propagation took over 30 minutes for a simple A record change. This used to be near-instant. What changed?','webmaster42','2026-03-25T13:00:00Z','complaint','negative',-0.6,'51-200','media','pro','growth','US'),
('f8','community','DNS changes are lightning fast. Updated my CNAME and it was live globally in under 60 seconds.','happy_admin','2026-03-24T10:30:00Z','praise','positive',0.9,'1000+','hosting','enterprise','growth','EU'),
('f9','community','Please add HTTPS record type support in the dashboard. It''s 2026 and we still can''t add HTTPS/SVCB records via the UI.','dns_nerd','2026-03-29T15:45:00Z','feature_request','negative',-0.3,'51-200','it_ops','pro','growth','US'),
('f10','support','Zero Trust Access policies are confusing to set up. The docs don''t match the actual UI flow. Had to open 3 support tickets.','security_lead','2026-03-28T09:00:00Z','complaint','negative',-0.8,'1000+','finance','enterprise','growth','US'),
('f11','email','Would love to see a step-by-step wizard for setting up Zero Trust for the first time. The current flow is overwhelming.','small_biz_cto','2026-03-27T11:30:00Z','feature_request','neutral',-0.1,'1-10','saas','free','early','US'),
('f12','x','R2 pricing is unbeatable. Migrated 50TB from S3 and saving $2k/month. The egress fees alone make it worth it.','cloud_economist','2026-03-30T14:00:00Z','praise','positive',0.95,'201-1000','e_commerce','pro','growth','US'),
('f13','github','R2 needs a proper lifecycle policy UI. Right now we have to use the API for everything related to object expiration.','storage_admin','2026-03-29T10:00:00Z','feature_request','neutral',0.0,'51-200','media','pro','growth','US'),
('f14','discord','Pages deployment failed silently 3 times today. No error in the UI, no webhook notification, just stuck at building.','jamstack_dev','2026-03-31T17:00:00Z','bug','negative',-0.8,'1-10','saas','free','early','EU'),
('f15','x','Cloudflare Pages + Workers integration is the best full-stack deployment experience I''ve ever used.','fullstack_fan','2026-03-26T09:30:00Z','praise','positive',0.9,'11-50','saas','pro','growth','US'),
('f16','community','The WAF custom rules editor needs regex support for URI path matching. Current string matching is too limited.','appsec_eng','2026-03-28T12:00:00Z','feature_request','neutral',-0.1,'201-1000','finance','enterprise','growth','US'),
('f17','email','Rate limiting rules saved us from a massive bot attack last week. The analytics were incredibly helpful for tuning thresholds.','incident_resp','2026-03-25T16:00:00Z','praise','positive',0.8,'1000+','finance','enterprise','growth','US'),
('f18','github','API documentation for the v4 endpoints is outdated. Several fields listed in docs don''t exist in responses anymore.','api_consumer','2026-03-30T11:30:00Z','bug','negative',-0.5,'51-200','saas','pro','growth','EU'),
('f19','support','The API is rock solid. 99.99% uptime in our monitoring over the past year. Excellent work.','reliability_eng','2026-03-27T15:00:00Z','praise','positive',0.95,'1000+','saas','enterprise','growth','US');

-- ============================================================
-- Seed: Completed analysis run
-- ============================================================
INSERT OR IGNORE INTO analysis_runs (id,status,prompt,filters_json,insight_count,created_at,started_at,finished_at) VALUES
('run-seed-001','succeeded','What are the most important product themes and issues across all channels?','{}',8,'2026-03-31T18:00:00Z','2026-03-31T18:00:05Z','2026-03-31T18:00:45Z');

-- ============================================================
-- Seed: Insights (8 themes)
-- ============================================================
INSERT OR IGNORE INTO insights (id,title,category,urgency_score,value_score,sentiment_score,sentiment_label,topics_json,urgency_factors_json,value_factors_json,trend_json,run_id,created_at,updated_at) VALUES
('i1','Dashboard Performance Issues','bug',75,70,-0.6,'negative',
  '[{"label":"Page Load Speed","count":12},{"label":"Zone Switching","count":8},{"label":"UI Responsiveness","count":5}]',
  '{"frequency_velocity":85,"source_diversity":70,"sentiment_intensity":80,"keyword_signals":65,"event_correlation":75}',
  '{"impact_breadth":75,"segment_weight":70,"revenue_keywords":55,"effort_estimate":60,"unique_author_ratio":85}',
  '[3,5,4,7,6,8,5]','run-seed-001','2026-03-31T18:00:45Z','2026-03-31T18:00:45Z'),

('i2','Workers Developer Experience','feature_request',45,85,0.1,'neutral',
  '[{"label":"TypeScript Support","count":15},{"label":"Wrangler CLI","count":11},{"label":"D1 Bindings","count":7}]',
  '{"frequency_velocity":50,"source_diversity":60,"sentiment_intensity":30,"keyword_signals":40,"event_correlation":45}',
  '{"impact_breadth":80,"segment_weight":85,"revenue_keywords":70,"effort_estimate":65,"unique_author_ratio":90}',
  '[5,6,8,7,9,10,12]','run-seed-001','2026-03-31T18:00:45Z','2026-03-31T18:00:45Z'),

('i3','DNS Propagation & Record Types','feature_request',60,65,-0.2,'neutral',
  '[{"label":"Propagation Speed","count":9},{"label":"HTTPS Records","count":6},{"label":"DNSSEC","count":3}]',
  '{"frequency_velocity":55,"source_diversity":55,"sentiment_intensity":50,"keyword_signals":60,"event_correlation":40}',
  '{"impact_breadth":65,"segment_weight":60,"revenue_keywords":50,"effort_estimate":55,"unique_author_ratio":70}',
  '[4,3,5,4,6,5,4]','run-seed-001','2026-03-31T18:00:45Z','2026-03-31T18:00:45Z'),

('i4','Zero Trust Onboarding Complexity','complaint',55,75,-0.7,'negative',
  '[{"label":"Setup Wizard","count":10},{"label":"Policy Config","count":8},{"label":"Documentation","count":6}]',
  '{"frequency_velocity":60,"source_diversity":65,"sentiment_intensity":75,"keyword_signals":50,"event_correlation":35}',
  '{"impact_breadth":70,"segment_weight":80,"revenue_keywords":75,"effort_estimate":50,"unique_author_ratio":75}',
  '[6,7,8,9,8,10,11]','run-seed-001','2026-03-31T18:00:45Z','2026-03-31T18:00:45Z'),

('i5','R2 Storage Value & Features','praise',25,80,0.6,'positive',
  '[{"label":"Pricing","count":14},{"label":"Lifecycle Policies","count":7},{"label":"S3 Compatibility","count":5}]',
  '{"frequency_velocity":20,"source_diversity":50,"sentiment_intensity":10,"keyword_signals":35,"event_correlation":30}',
  '{"impact_breadth":85,"segment_weight":75,"revenue_keywords":90,"effort_estimate":70,"unique_author_ratio":80}',
  '[8,9,10,11,12,13,15]','run-seed-001','2026-03-31T18:00:45Z','2026-03-31T18:00:45Z'),

('i6','Pages Deployment Reliability','bug',70,72,-0.3,'neutral',
  '[{"label":"Build Failures","count":11},{"label":"Silent Errors","count":8},{"label":"Workers Integration","count":6}]',
  '{"frequency_velocity":75,"source_diversity":60,"sentiment_intensity":65,"keyword_signals":70,"event_correlation":55}',
  '{"impact_breadth":70,"segment_weight":65,"revenue_keywords":60,"effort_estimate":65,"unique_author_ratio":80}',
  '[5,7,6,8,7,9,6]','run-seed-001','2026-03-31T18:00:45Z','2026-03-31T18:00:45Z'),

('i7','WAF & Security Rules Enhancement','feature_request',40,65,0.3,'positive',
  '[{"label":"Custom Rules","count":9},{"label":"Rate Limiting","count":7},{"label":"Regex Support","count":5}]',
  '{"frequency_velocity":35,"source_diversity":45,"sentiment_intensity":25,"keyword_signals":50,"event_correlation":30}',
  '{"impact_breadth":60,"segment_weight":70,"revenue_keywords":65,"effort_estimate":55,"unique_author_ratio":65}',
  '[3,4,5,6,5,7,8]','run-seed-001','2026-03-31T18:00:45Z','2026-03-31T18:00:45Z'),

('i8','API Documentation Quality','bug',50,60,0.1,'neutral',
  '[{"label":"v4 Endpoints","count":12},{"label":"Response Schema","count":8},{"label":"Reliability","count":4}]',
  '{"frequency_velocity":45,"source_diversity":50,"sentiment_intensity":40,"keyword_signals":55,"event_correlation":35}',
  '{"impact_breadth":60,"segment_weight":55,"revenue_keywords":45,"effort_estimate":60,"unique_author_ratio":70}',
  '[6,5,7,6,8,7,9]','run-seed-001','2026-03-31T18:00:45Z','2026-03-31T18:00:45Z');

-- ============================================================
-- Seed: Insight <-> Feedback links
-- ============================================================
INSERT OR IGNORE INTO insight_feedback (insight_id,feedback_id) VALUES
('i1','f1'),('i1','f2'),('i1','f3'),
('i2','f4'),('i2','f5'),('i2','f6'),
('i3','f7'),('i3','f8'),('i3','f9'),
('i4','f10'),('i4','f11'),
('i5','f12'),('i5','f13'),
('i6','f14'),('i6','f15'),
('i7','f16'),('i7','f17'),
('i8','f18'),('i8','f19');

-- ============================================================
-- Seed: Events
-- ============================================================
INSERT OR IGNORE INTO events (id,type,title,description,start_time,end_time,source) VALUES
('evt-001','incident','Dashboard Latency Incident','Elevated latency in dashboard zone-switching requests; rollback deployed at 14:30 UTC.','2026-03-27T08:00:00Z','2026-03-27T14:30:00Z','seed'),
('evt-002','launch','R2 General Availability','R2 object storage officially enters GA with lifecycle policy API and expanded region support.','2026-03-29T12:00:00Z',NULL,'seed'),
('evt-003','blog','Workers Platform Updates','Blog post covering Workers DX improvements, new D1 bindings, and Wrangler 4.0 changelog.','2026-03-26T09:00:00Z',NULL,'seed');

-- ============================================================
-- Seed: Event correlations
-- ============================================================
INSERT OR IGNORE INTO event_correlations (run_id,event_id,related_insights_json,notes) VALUES
('run-seed-001','evt-001','[{"id":"i1","title":"Dashboard Performance Issues","count":3}]','Incident window (Mar 27 08:00–14:30) overlaps with a spike in dashboard performance complaints; feedback volume +140% vs prior 3-day baseline.'),
('run-seed-001','evt-002','[{"id":"i5","title":"R2 Storage Value & Features","count":2}]','R2 GA announcement correlated with praise uptick (+3 items Mar 29–30) and lifecycle policy feature requests.'),
('run-seed-001','evt-003','[{"id":"i2","title":"Workers Developer Experience","count":3}]','Blog post generated developer engagement: TypeScript/Wrangler feedback accelerated day-over-day following publication.');

-- ============================================================
-- Seed: Daily feedback metrics (Mar 24–31)
-- ============================================================
INSERT OR IGNORE INTO daily_feedback_metrics (day,run_id,total_count,by_category_json,by_source_json) VALUES
('2026-03-24','run-seed-001',1,'{"praise":1}','{"community":1}'),
('2026-03-25','run-seed-001',2,'{"complaint":1,"praise":1}','{"support":1,"email":1}'),
('2026-03-26','run-seed-001',2,'{"praise":2}','{"x":2}'),
('2026-03-27','run-seed-001',3,'{"bug":1,"feature_request":1,"praise":1}','{"discord":1,"email":1,"support":1}'),
('2026-03-28','run-seed-001',3,'{"complaint":2,"feature_request":1}','{"community":1,"support":1,"community":1}'),
('2026-03-29','run-seed-001',3,'{"feature_request":3}','{"github":3}'),
('2026-03-30','run-seed-001',3,'{"feature_request":1,"praise":1,"bug":1}','{"github":2,"x":1}'),
('2026-03-31','run-seed-001',2,'{"bug":2}','{"github":1,"discord":1}');

-- ============================================================
-- Seed: Segment metrics
-- ============================================================
INSERT OR IGNORE INTO segment_issue_metrics (run_id,segment_key,top_insights_json,by_category_json) VALUES
('run-seed-001','industry=saas|size=1-50|tier=free',
  '[{"id":"i2","title":"Workers Developer Experience","count":3},{"id":"i6","title":"Pages Deployment Reliability","count":2}]',
  '{"feature_request":3,"bug":2,"praise":1}'),
('run-seed-001','industry=saas|size=201-1000|tier=pro',
  '[{"id":"i1","title":"Dashboard Performance Issues","count":2},{"id":"i5","title":"R2 Storage Value & Features","count":1}]',
  '{"complaint":2,"praise":1,"feature_request":1}'),
('run-seed-001','industry=finance|size=1000+|tier=enterprise',
  '[{"id":"i4","title":"Zero Trust Onboarding Complexity","count":2},{"id":"i7","title":"WAF & Security Rules Enhancement","count":2}]',
  '{"complaint":2,"feature_request":1,"praise":1}');
