import type { Env } from '../index';
import { json, mapFeedback, type FeedbackRow } from '../lib/db';

export async function handleFeedback(request: Request, env: Env, path: string): Promise<Response> {
  const url = new URL(request.url);

  // GET /feedback or GET /feedback?search=&source=&category=&limit=&cursor=
  if (request.method === 'GET' && (path === '/feedback' || path === '/feedback/')) {
    const search = url.searchParams.get('search') || '';
    const source = url.searchParams.get('source') || '';
    const category = url.searchParams.get('category') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const cursor = url.searchParams.get('cursor') || '';

    let q = 'SELECT * FROM feedback WHERE 1=1';
    const params: (string | number)[] = [];

    if (search) {
      q += ' AND (text LIKE ? OR author LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (source) { q += ' AND source = ?'; params.push(source); }
    if (category) { q += ' AND category = ?'; params.push(category); }
    if (cursor) { q += ' AND created_at < ?'; params.push(cursor); }

    q += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit + 1);

    const result = await env.DB.prepare(q).bind(...params).all();
    const rows = result.results as unknown as FeedbackRow[];
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(mapFeedback);
    const nextCursor = hasMore ? rows[limit - 1].created_at : null;

    return json({ feedback: items, hasMore, nextCursor });
  }

  // POST /feedback
  if (request.method === 'POST' && (path === '/feedback' || path === '/feedback/')) {
    let body: any;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { source, text, author, category, sentiment, company_size_bucket, industry, plan_tier, company_stage, region } = body;
    if (!source || !text) return json({ error: 'source and text are required' }, 400);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO feedback (id,source,text,author,created_at,category,sentiment_label,company_size_bucket,industry,plan_tier,company_stage,region,metadata_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'{}')`
    ).bind(id, source, text, author || 'anonymous', now, category || 'question', sentiment || null,
      company_size_bucket || null, industry || null, plan_tier || null, company_stage || null, region || null).run();

    return json({ id, created_at: now }, 201);
  }

  // POST /feedback/seed — insert next 10 items from a 100-item bank
  if (request.method === 'POST' && path === '/feedback/seed') {
    const SEED_BANK = [
      { source: 'discord', text: 'Workers AI inference latency is impressive — sub-100ms for most requests. The bge embedding model is perfect for semantic search.', author: 'ml_engineer', category: 'praise', sentiment: 'positive', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 1 },
      { source: 'github', text: 'Hyperdrive connection pooling saved us massively. Went from 400ms cold queries to under 20ms consistently. Would love Redis/Valkey support next.', author: 'backend_gopher', category: 'praise', sentiment: 'positive', industry: 'saas', size: '11-50', tier: 'pro', daysAgo: 2 },
      { source: 'community', text: 'KV reads are eventually consistent but the inconsistency window is unpredictable. We\'ve had stale data served for up to 60 seconds. Need stronger consistency for financial data.', author: 'fintech_dev', category: 'complaint', sentiment: 'negative', industry: 'finance', size: '201-1000', tier: 'enterprise', daysAgo: 3 },
      { source: 'support', text: 'R2 multipart upload is broken for files over 5GB. Upload completes but object is corrupted. Reproducible every time.', author: 'data_eng_42', category: 'bug', sentiment: 'negative', industry: 'media', size: '51-200', tier: 'pro', daysAgo: 1 },
      { source: 'x', text: 'Cloudflare Tunnel is genuinely magic. Exposed our dev environment through a single daemon. Zero firewall rules, zero VPN headaches.', author: 'devrel_hannah', category: 'praise', sentiment: 'positive', industry: 'saas', size: '1-10', tier: 'free', daysAgo: 4 },
      { source: 'github', text: 'Zero Trust SCIM provisioning fails silently when syncing >200 users from Okta. No error in logs, groups just don\'t appear.', author: 'identity_arch', category: 'bug', sentiment: 'negative', industry: 'finance', size: '1000+', tier: 'enterprise', daysAgo: 2 },
      { source: 'email', text: 'We need self-hosted runner support for CI/CD. Our compliance team won\'t allow source code to leave our VPC. Pages Builds is a non-starter for us.', author: 'compliance_cto', category: 'feature_request', sentiment: 'neutral', industry: 'finance', size: '1000+', tier: 'enterprise', daysAgo: 5 },
      { source: 'discord', text: 'Durable Objects are perfect for our multiplayer game state. Eliminated an entire Redis cluster. Hibernation API is a game-changer for costs.', author: 'gamedev_rustam', category: 'praise', sentiment: 'positive', industry: 'gaming', size: '11-50', tier: 'pro', daysAgo: 3 },
      { source: 'community', text: 'Images transformation API needs WebP to AVIF support. Our Lighthouse scores are stuck because of this gap. Competitors already support AVIF output.', author: 'perf_obsessed', category: 'feature_request', sentiment: 'neutral', industry: 'e_commerce', size: '51-200', tier: 'pro', daysAgo: 2 },
      { source: 'github', text: 'wrangler tail is missing request body for POST requests. Makes debugging webhook handlers painful — have to add console.log everywhere.', author: 'webhooks_dev', category: 'bug', sentiment: 'negative', industry: 'saas', size: '11-50', tier: 'free', daysAgo: 1 },
      { source: 'support', text: 'Rate limit of 1000 subrequests per Worker invocation is too low for data aggregation pipelines. We fan out to ~3000 D1 queries per request.', author: 'data_platform', category: 'complaint', sentiment: 'negative', industry: 'saas', size: '201-1000', tier: 'pro', daysAgo: 4 },
      { source: 'x', text: 'Pages preview deployments are a massive productivity boost. Every PR gets a live URL automatically. Clients can review on real infrastructure before merge.', author: 'agency_lead', category: 'praise', sentiment: 'positive', industry: 'media', size: '11-50', tier: 'pro', daysAgo: 5 },
      { source: 'community', text: 'Would love native SSE support in Workers. Currently hacking with TransformStream but a proper API would be cleaner for AI streaming.', author: 'ai_product_eng', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 3 },
      { source: 'email', text: 'Vectorize query latency spikes to 800ms+ under load. P95 is inconsistent. Great when cold, falls over with concurrent queries.', author: 'search_infra', category: 'complaint', sentiment: 'negative', industry: 'saas', size: '201-1000', tier: 'pro', daysAgo: 6 },
      { source: 'discord', text: 'Workers Cron Triggers are extremely reliable. Moved all scheduled jobs off Lambda+EventBridge and cut operational overhead by 80%.', author: 'platform_eng', category: 'praise', sentiment: 'positive', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 7 },
      { source: 'github', text: 'D1 read performance is excellent but write throughput caps out around 50 writes/sec for us. Bottleneck for high-write workloads.', author: 'db_architect', category: 'complaint', sentiment: 'negative', industry: 'saas', size: '201-1000', tier: 'pro', daysAgo: 2 },
      { source: 'support', text: 'Workers AI text generation models sometimes return malformed JSON even with explicit prompting. Need a JSON mode flag similar to OpenAI.', author: 'llm_integrator', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 1 },
      { source: 'community', text: 'Access Groups in Zero Trust are confusing to configure. Took our team 2 hours to figure out the correct policy nesting for a simple use case.', author: 'sysadmin_jo', category: 'complaint', sentiment: 'negative', industry: 'finance', size: '201-1000', tier: 'enterprise', daysAgo: 3 },
      { source: 'x', text: 'Workers Workflows have transformed how we handle async jobs. No more SQS + Lambda glue code. Everything is just a step in TypeScript.', author: 'fullstack_dev', category: 'praise', sentiment: 'positive', industry: 'saas', size: '11-50', tier: 'pro', daysAgo: 2 },
      { source: 'email', text: 'We need audit logs for all D1 queries in production. Compliance requires being able to answer who queried what data and when.', author: 'chief_compliance', category: 'feature_request', sentiment: 'neutral', industry: 'finance', size: '1000+', tier: 'enterprise', daysAgo: 4 },
      { source: 'discord', text: 'R2 is the best S3-compatible storage I\'ve used. No egress fees makes our CDN costs predictable. Switched from GCS and haven\'t looked back.', author: 'infra_lead', category: 'praise', sentiment: 'positive', industry: 'media', size: '51-200', tier: 'pro', daysAgo: 1 },
      { source: 'github', text: 'Workers Smart Placement is a great idea but it sometimes routes to regions that are actually slower for our users in Southeast Asia.', author: 'se_asia_dev', category: 'bug', sentiment: 'negative', industry: 'e_commerce', size: '51-200', tier: 'pro', daysAgo: 5 },
      { source: 'support', text: 'Cloudflare Bot Management blocks legitimate users from our React Native app. The challenge flow breaks on mobile WebViews.', author: 'mobile_eng', category: 'bug', sentiment: 'negative', industry: 'e_commerce', size: '201-1000', tier: 'enterprise', daysAgo: 2 },
      { source: 'community', text: 'Would love a built-in A/B testing framework in Workers. Currently rolling our own with KV but a first-class solution would save us weeks.', author: 'growth_pm', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 6 },
      { source: 'x', text: 'Pages Functions are underrated. Full Workers runtime at the edge for every page route with zero config. Better than Next.js API routes for our use case.', author: 'jamstack_dev', category: 'praise', sentiment: 'positive', industry: 'saas', size: '1-10', tier: 'free', daysAgo: 3 },
      { source: 'email', text: 'The Workers observability dashboard is too limited. We need custom metrics, histogram buckets, and alerting on p99 latency without leaving Cloudflare.', author: 'sre_lead', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '201-1000', tier: 'enterprise', daysAgo: 4 },
      { source: 'discord', text: 'AI Gateway is exactly what we needed for LLM cost management. Rate limiting and caching AI responses cut our OpenAI bill by 40%.', author: 'ai_startup_cto', category: 'praise', sentiment: 'positive', industry: 'saas', size: '1-10', tier: 'pro', daysAgo: 1 },
      { source: 'github', text: 'Queues consumer sometimes processes the same message twice even with once-delivery semantics. Causing duplicate entries in our database.', author: 'queue_eng', category: 'bug', sentiment: 'negative', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 2 },
      { source: 'support', text: 'Certificate issuance for wildcard subdomains is taking over 48 hours. Our staging environment has been down since the SSL cert expired.', author: 'webmaster_99', category: 'bug', sentiment: 'negative', industry: 'media', size: '11-50', tier: 'free', daysAgo: 1 },
      { source: 'community', text: 'Waiting Room is brilliant for flash sales. Handled 50k concurrent users queuing for a product drop with zero backend pressure. No code changes needed.', author: 'ecommerce_eng', category: 'praise', sentiment: 'positive', industry: 'e_commerce', size: '51-200', tier: 'enterprise', daysAgo: 5 },
      { source: 'x', text: 'Wrangler dev environment is slow to hot-reload on Windows. Changes take 8-10 seconds to reflect. Needs to be under 1 second to be usable.', author: 'windows_dev', category: 'complaint', sentiment: 'negative', industry: 'saas', size: '11-50', tier: 'free', daysAgo: 3 },
      { source: 'email', text: 'Would love Cloudflare to support PostgreSQL wire protocol for D1. Our existing ORM tooling would work out of the box without any code changes.', author: 'backend_lead', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '201-1000', tier: 'pro', daysAgo: 7 },
      { source: 'discord', text: 'Email routing just works. Set up custom domain email in 10 minutes. Forwarding to multiple recipients and the API for programmatic control are huge.', author: 'indie_hacker', category: 'praise', sentiment: 'positive', industry: 'saas', size: '1-10', tier: 'free', daysAgo: 4 },
      { source: 'github', text: 'Workers AI runs older model versions without a way to pin to a specific version. Our prompts break when you silently update models.', author: 'prod_ai_eng', category: 'complaint', sentiment: 'negative', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 2 },
      { source: 'support', text: 'Analytics Engine is exactly what I needed — columnar storage at the edge with no egress costs. Writing 10M events/day with sub-ms inserts.', author: 'analytics_founder', category: 'praise', sentiment: 'positive', industry: 'saas', size: '1-10', tier: 'pro', daysAgo: 6 },
      { source: 'community', text: 'D1 needs native full-text search. Currently moving data out to Algolia just for search. Having this built-in would let us stay 100% on Cloudflare.', author: 'search_pm', category: 'feature_request', sentiment: 'neutral', industry: 'e_commerce', size: '51-200', tier: 'pro', daysAgo: 3 },
      { source: 'x', text: 'Cloudflare DDoS protection blocked 2 million requests targeting our API yesterday. Zero downtime, zero config required. Unmatched reliability.', author: 'security_eng', category: 'praise', sentiment: 'positive', industry: 'finance', size: '201-1000', tier: 'enterprise', daysAgo: 1 },
      { source: 'email', text: 'Hyperdrive doesn\'t support connection string rotation. Our security policy requires rotating database credentials every 30 days but Hyperdrive makes this painful.', author: 'devsec_lead', category: 'complaint', sentiment: 'negative', industry: 'finance', size: '1000+', tier: 'enterprise', daysAgo: 5 },
      { source: 'discord', text: 'Workers Sites migration to Pages was seamless. The guided migration tool handled everything. CI/CD integration with GitHub Actions took 5 minutes.', author: 'frontend_migrator', category: 'praise', sentiment: 'positive', industry: 'media', size: '11-50', tier: 'pro', daysAgo: 2 },
      { source: 'github', text: 'R2 event notifications are missing for object deletions. We need delete events for our audit trail but only creation events are supported.', author: 'storage_eng', category: 'feature_request', sentiment: 'neutral', industry: 'finance', size: '201-1000', tier: 'enterprise', daysAgo: 4 },
      { source: 'support', text: 'Workers runtime throws a cryptic error when a WebSocket connection is held open for more than 100 seconds. No documentation on this limit.', author: 'realtime_dev', category: 'bug', sentiment: 'negative', industry: 'gaming', size: '11-50', tier: 'pro', daysAgo: 1 },
      { source: 'community', text: 'Load Balancing health checks are generating too much noise. Every transient timeout triggers an alert. Need configurable threshold and backoff settings.', author: 'oncall_sre', category: 'complaint', sentiment: 'negative', industry: 'saas', size: '51-200', tier: 'enterprise', daysAgo: 3 },
      { source: 'x', text: 'Cloudflare Radar is genuinely one of the best free internet intelligence tools available. Sharing it with customers for DDoS context is incredibly useful.', author: 'netops_pro', category: 'praise', sentiment: 'positive', industry: 'saas', size: '201-1000', tier: 'enterprise', daysAgo: 7 },
      { source: 'email', text: 'We need multi-region D1 read replicas. Our users in APAC are seeing 300ms query latency because the primary is in US-East. Global apps need global databases.', author: 'global_cto', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '1000+', tier: 'enterprise', daysAgo: 5 },
      { source: 'discord', text: 'KV write limits are too restrictive for our use case. 1 write/second per key is fine for caching but we\'re building a real-time leaderboard that updates every 100ms.', author: 'game_backend', category: 'complaint', sentiment: 'negative', industry: 'gaming', size: '11-50', tier: 'pro', daysAgo: 2 },
      { source: 'github', text: 'Workers Vitest integration is a huge DX improvement. Writing unit tests that run in the actual Workers runtime catches edge cases we couldn\'t find before.', author: 'test_driven', category: 'praise', sentiment: 'positive', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 3 },
      { source: 'support', text: 'IP geolocation in Workers returns wrong country for users on corporate VPNs. Our geo-gated content is completely unreliable for enterprise customers.', author: 'geo_product', category: 'bug', sentiment: 'negative', industry: 'media', size: '51-200', tier: 'pro', daysAgo: 1 },
      { source: 'community', text: 'Cloudflare Stream transcoding is slow for 4K uploads — takes 3x longer than Mux. For live streaming applications this delay is unacceptable.', author: 'video_startup', category: 'complaint', sentiment: 'negative', industry: 'media', size: '1-10', tier: 'pro', daysAgo: 4 },
      { source: 'x', text: 'The Cloudflare dashboard redesign is clean and fast. Finding settings is much easier now. The new analytics graphs are exactly what I needed for capacity planning.', author: 'happy_customer', category: 'praise', sentiment: 'positive', industry: 'e_commerce', size: '11-50', tier: 'pro', daysAgo: 6 },
      { source: 'email', text: 'Need proper TypeScript types for Workers Env bindings auto-generated from wrangler.toml. Manually typing them is error-prone and slows onboarding.', author: 'dx_focused', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '11-50', tier: 'pro', daysAgo: 2 },
      { source: 'discord', text: 'Durable Objects pricing is confusing. Duration billing with 10ms minimum increments made our invoice unpredictable. Need clearer cost estimator.', author: 'cost_conscious', category: 'complaint', sentiment: 'negative', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 5 },
      { source: 'github', text: 'Workers Workflows retry logic with exponential backoff handles our payment processing failures gracefully. No more orphaned transactions.', author: 'payments_eng', category: 'praise', sentiment: 'positive', industry: 'finance', size: '11-50', tier: 'pro', daysAgo: 1 },
      { source: 'support', text: 'Browser Rendering API crashes on pages with large canvas elements. Our screenshot service fails on 20% of pages with complex visualizations.', author: 'screenshot_svc', category: 'bug', sentiment: 'negative', industry: 'saas', size: '1-10', tier: 'pro', daysAgo: 3 },
      { source: 'community', text: 'Would love Cloudflare to offer a managed Postgres with global read replicas. Something like Neon or PlanetScale but natively integrated with Workers.', author: 'db_nerd', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 4 },
      { source: 'x', text: 'Magic Transit stopped a 1.2 Tbps attack against our infrastructure last week. Not a single packet reached our servers. Completely invisible to our users.', author: 'network_dir', category: 'praise', sentiment: 'positive', industry: 'finance', size: '1000+', tier: 'enterprise', daysAgo: 2 },
      { source: 'email', text: 'CASB integration for Google Workspace is missing granular policies. We can block apps but can\'t allow specific API scopes. Too blunt for real governance.', author: 'it_security', category: 'complaint', sentiment: 'negative', industry: 'saas', size: '1000+', tier: 'enterprise', daysAgo: 6 },
      { source: 'discord', text: 'AI Gateway caching is saving us ~$800/month on repeated LLM calls. The semantic similarity matching for cache hits is surprisingly accurate.', author: 'frugal_cto', category: 'praise', sentiment: 'positive', industry: 'saas', size: '1-10', tier: 'pro', daysAgo: 3 },
      { source: 'github', text: 'Vectorize index updates have a 30-60 second delay before new vectors are queryable. Our real-time personalization requires sub-second index freshness.', author: 'ml_infra', category: 'complaint', sentiment: 'negative', industry: 'e_commerce', size: '201-1000', tier: 'enterprise', daysAgo: 1 },
      { source: 'support', text: 'Workers Logs retention is only 7 days on the free plan. Need at least 30 days for incident post-mortems. Should be a paid add-on if not included.', author: 'startup_eng', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '1-10', tier: 'free', daysAgo: 5 },
      { source: 'community', text: 'R2 presigned URLs work perfectly for our user-generated content workflow. Simple to implement and zero egress costs is a massive advantage over S3.', author: 'ugc_platform', category: 'praise', sentiment: 'positive', industry: 'media', size: '51-200', tier: 'pro', daysAgo: 4 },
      { source: 'x', text: 'Cloudflare Pages build times increased by 40% after your recent infrastructure change. Our CI/CD pipeline went from 2 min to 3.5 min deploys.', author: 'ci_heavy', category: 'complaint', sentiment: 'negative', industry: 'saas', size: '11-50', tier: 'pro', daysAgo: 2 },
      { source: 'email', text: 'Need Workers AI to support fine-tuned model weights stored in R2. We want to bring our own LoRA adapters without leaving the Cloudflare ecosystem.', author: 'ml_researcher', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '51-200', tier: 'enterprise', daysAgo: 7 },
      { source: 'discord', text: 'Queues is the missing piece for our event-driven architecture. Replaced AWS SQS+Lambda and our infrastructure cost dropped by 60%.', author: 'aws_refugee', category: 'praise', sentiment: 'positive', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 3 },
      { source: 'github', text: 'wrangler types command doesn\'t pick up Durable Object namespaces defined in other Workers. Causes type errors across packages in our monorepo.', author: 'monorepo_eng', category: 'bug', sentiment: 'negative', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 1 },
      { source: 'support', text: 'Rate limiting rules don\'t apply to WebSocket upgrade requests. Our WebSocket API is getting hammered by bots with no way to defend at the edge.', author: 'ws_under_attack', category: 'bug', sentiment: 'negative', industry: 'gaming', size: '11-50', tier: 'pro', daysAgo: 2 },
      { source: 'community', text: 'Cloudflare for Teams has saved our remote team. Zero Trust access for all internal apps, no VPN required. The WARP client is lightweight and reliable.', author: 'remote_first_cto', category: 'praise', sentiment: 'positive', industry: 'saas', size: '11-50', tier: 'enterprise', daysAgo: 5 },
      { source: 'x', text: 'D1 transactions support is limited — no savepoints, no nested transactions. Migrating from PostgreSQL requires major refactors of our data layer.', author: 'pg_migrator', category: 'complaint', sentiment: 'negative', industry: 'saas', size: '201-1000', tier: 'pro', daysAgo: 4 },
      { source: 'email', text: 'Would appreciate a Cloudflare-native secret management service. Currently using KV for secrets which lacks encryption at rest and access logging.', author: 'security_pm', category: 'feature_request', sentiment: 'neutral', industry: 'finance', size: '51-200', tier: 'enterprise', daysAgo: 3 },
      { source: 'discord', text: 'Workers for Platforms lets us give each customer their own Worker namespace. Building a multi-tenant SaaS on top of it is incredibly powerful.', author: 'platform_saas', category: 'praise', sentiment: 'positive', industry: 'saas', size: '11-50', tier: 'enterprise', daysAgo: 2 },
      { source: 'github', text: 'Analytics Engine SQL API is missing window functions. GROUP BY with rolling averages requires multiple queries and client-side computation.', author: 'data_analyst', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 6 },
      { source: 'support', text: 'DLP integration in Gateway is scanning PDFs incorrectly — flagging public marketing materials as sensitive. False positive rate is too high for production use.', author: 'dlp_admin', category: 'bug', sentiment: 'negative', industry: 'finance', size: '1000+', tier: 'enterprise', daysAgo: 1 },
      { source: 'community', text: 'Snippets are a great lightweight option between Page Rules and Workers. Replaced 20 Page Rules with 3 snippets and the logic is much cleaner.', author: 'rule_optimizer', category: 'praise', sentiment: 'positive', industry: 'e_commerce', size: '51-200', tier: 'pro', daysAgo: 4 },
      { source: 'x', text: 'Workers AI image generation with Stable Diffusion is incredibly fast. Generating product mockups in under 2 seconds, directly from a Worker.', author: 'creative_tech', category: 'praise', sentiment: 'positive', industry: 'media', size: '1-10', tier: 'pro', daysAgo: 3 },
      { source: 'email', text: 'Need bi-directional sync for KV namespaces across accounts. We manage 50 customer accounts and propagating config changes manually is a major operational burden.', author: 'mssp_ops', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '201-1000', tier: 'enterprise', daysAgo: 5 },
      { source: 'discord', text: 'Workers Secrets are too limited — only 1000 per account is not enough for our SaaS where each customer has their own credential set.', author: 'tenant_chaos', category: 'complaint', sentiment: 'negative', industry: 'saas', size: '51-200', tier: 'enterprise', daysAgo: 2 },
      { source: 'github', text: 'D1 backup and restore works flawlessly. Tested a full restore from a 2GB database — took under 3 minutes. Disaster recovery planning is now straightforward.', author: 'backup_obsessed', category: 'praise', sentiment: 'positive', industry: 'finance', size: '201-1000', tier: 'enterprise', daysAgo: 1 },
      { source: 'support', text: 'DNS propagation after adding a new CNAME is taking 20+ minutes. Previously it was near-instant. Something changed in the last deployment.', author: 'dns_frustrated', category: 'bug', sentiment: 'negative', industry: 'saas', size: '11-50', tier: 'pro', daysAgo: 3 },
      { source: 'community', text: 'Cloudflare Images with responsive variants is a huge DX win. One upload, automatic resizing for every breakpoint, and the perceptual hash deduplication saves storage.', author: 'img_optimizer', category: 'praise', sentiment: 'positive', industry: 'e_commerce', size: '51-200', tier: 'pro', daysAgo: 7 },
      { source: 'x', text: 'AI Gateway streaming support for SSE is broken with Anthropic Claude. Works fine with OpenAI. The response gets buffered and delivered all at once.', author: 'claude_user', category: 'bug', sentiment: 'negative', industry: 'saas', size: '11-50', tier: 'pro', daysAgo: 2 },
      { source: 'email', text: 'Workers observability needs distributed tracing. We have 15 Workers that call each other and debugging latency issues across the chain is impossible right now.', author: 'distributed_eng', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '201-1000', tier: 'enterprise', daysAgo: 4 },
      { source: 'discord', text: 'The new Cloudflare dashboard speed is night and day. Used to take 3-4 seconds to load analytics, now it\'s instant. Whatever you did, keep doing it.', author: 'dashboard_fan', category: 'praise', sentiment: 'positive', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 1 },
      { source: 'github', text: 'R2 doesn\'t support object locking for compliance. We need WORM storage for financial records. This is blocking our move from S3 to R2.', author: 'compliance_arch', category: 'feature_request', sentiment: 'neutral', industry: 'finance', size: '1000+', tier: 'enterprise', daysAgo: 5 },
      { source: 'support', text: 'Magic WAN configuration portal is unusable on Chrome 120. All the dropdowns are broken. Had to use Safari to complete our network setup.', author: 'network_admin', category: 'bug', sentiment: 'negative', industry: 'finance', size: '1000+', tier: 'enterprise', daysAgo: 2 },
      { source: 'community', text: 'Cloudflare Zaraz has cut our page load time by 800ms by loading third-party scripts from the edge. Our Core Web Vitals went from red to green overnight.', author: 'web_perf_eng', category: 'praise', sentiment: 'positive', industry: 'e_commerce', size: '51-200', tier: 'pro', daysAgo: 3 },
      { source: 'x', text: 'Turnstile challenges are invisible and accessible. Replaced reCAPTCHA and our form completion rate went up 12%. No more puzzles for legitimate users.', author: 'ux_researcher', category: 'praise', sentiment: 'positive', industry: 'e_commerce', size: '51-200', tier: 'pro', daysAgo: 6 },
      { source: 'email', text: 'Need a Workers AI function calling / tool use API. We want structured outputs where the model calls our APIs rather than generating free-form text.', author: 'agentic_builder', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '11-50', tier: 'pro', daysAgo: 4 },
      { source: 'discord', text: 'Zero Trust Application tiered access based on identity + device posture is exactly the security model we needed for our healthcare app. HIPAA compliance simplified.', author: 'health_cto', category: 'praise', sentiment: 'positive', industry: 'healthcare', size: '51-200', tier: 'enterprise', daysAgo: 2 },
      { source: 'github', text: 'Workflows are missing a pause/resume step. Our human-in-the-loop approval flows need to wait for a webhook callback, not just a timer.', author: 'approval_flow', category: 'feature_request', sentiment: 'neutral', industry: 'finance', size: '201-1000', tier: 'enterprise', daysAgo: 1 },
      { source: 'support', text: 'D1 export to CSV is missing from the dashboard. Our business team needs to pull data for reporting and they can\'t run wrangler commands.', author: 'no_code_ops', category: 'feature_request', sentiment: 'neutral', industry: 'saas', size: '51-200', tier: 'pro', daysAgo: 3 },
      { source: 'community', text: 'Workers AI code generation model is surprisingly capable for boilerplate. Generating Workers from natural language descriptions saves 30 minutes per microservice.', author: 'gen_ai_fan', category: 'praise', sentiment: 'positive', industry: 'saas', size: '11-50', tier: 'pro', daysAgo: 5 },
      { source: 'x', text: 'Cloudflare Stream live video has sub-2-second latency using LL-HLS. For our sports streaming app this was the last blocker to dropping our CDN vendor.', author: 'live_video_eng', category: 'praise', sentiment: 'positive', industry: 'media', size: '11-50', tier: 'enterprise', daysAgo: 4 },
    ];

    const BATCH_SIZE = 10;

    // Count already-seeded items
    const seededCount = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM feedback WHERE json_extract(metadata_json, '$.seed') = 1`
    ).first() as any;

    const already = seededCount?.cnt ?? 0;

    if (already >= SEED_BANK.length) {
      return json({ inserted: 0, remaining: 0, exhausted: true }, 200);
    }

    const batch = SEED_BANK.slice(already, already + BATCH_SIZE);
    const now = new Date();

    const stmts = batch.map((item, i) => {
      const id = crypto.randomUUID();
      const date = new Date(now.getTime() - (item.daysAgo + Math.floor(i / 2)) * 86_400_000).toISOString();
      return env.DB.prepare(
        `INSERT INTO feedback (id,source,text,author,created_at,category,sentiment_label,company_size_bucket,industry,plan_tier,metadata_json)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(id, item.source, item.text, item.author, date, item.category, item.sentiment, item.size, item.industry, item.tier, '{"seed":1}');
    });

    await env.DB.batch(stmts);
    const remaining = Math.max(0, SEED_BANK.length - already - batch.length);
    return json({ inserted: batch.length, remaining, exhausted: remaining === 0 }, 201);
  }

  return json({ error: 'Not found' }, 404);
}
