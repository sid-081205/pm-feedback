export type Source = "discord" | "github" | "x" | "support" | "email" | "community";
export type Category = "feature_request" | "bug" | "praise" | "complaint" | "question";
export type Sentiment = "positive" | "negative" | "neutral" | "mixed";

export interface FeedbackItem {
  id: string;
  text: string;
  author: string;
  source: Source;
  date: string;
  sentiment: Sentiment;
  category: Category;
  rating?: number;
  insightId?: string;
}

export interface InsightTopic {
  label: string;
  count: number;
}

export interface Insight {
  id: string;
  title: string;
  topics: InsightTopic[];
  category: Category;
  mentions: number;
  sources: Source[];
  sentimentScore: number; // -1 to 1
  trend: number[]; // sparkline data
  feedbackIds: string[];
}

export const sourceLabels: Record<Source, string> = {
  discord: "Discord",
  github: "GitHub",
  x: "X / Twitter",
  support: "Support Ticket",
  email: "Email",
  community: "Community Forum",
};

export const categoryLabels: Record<Category, string> = {
  feature_request: "Feature",
  bug: "Bug",
  praise: "Praise",
  complaint: "Complaint",
  question: "Question",
};

export const categoryColors: Record<Category, string> = {
  feature_request: "bg-primary/20 text-primary",
  bug: "bg-destructive/20 text-destructive",
  praise: "bg-success/20 text-success",
  complaint: "bg-warning/20 text-warning",
  question: "bg-muted text-muted-foreground",
};

export const initialFeedback: FeedbackItem[] = [
  { id: "f1", text: "The Cloudflare dashboard is painfully slow when switching between zones. It takes 3-4 seconds just to load the DNS page. This is a significant productivity killer when managing 50+ domains.", author: "netadmin_pro", source: "community", date: "2026-03-28", sentiment: "negative", category: "complaint", rating: 2, insightId: "i1" },
  { id: "f2", text: "Dashboard performance has gotten worse after the last update. Page transitions feel sluggish.", author: "devops_sarah", source: "discord", date: "2026-03-27", sentiment: "negative", category: "bug", rating: 1, insightId: "i1" },
  { id: "f3", text: "Can we get a keyboard shortcut to quickly switch between zones in the dashboard? That would speed things up.", author: "keybind_king", source: "github", date: "2026-03-30", sentiment: "neutral", category: "feature_request", insightId: "i1" },
  { id: "f4", text: "Workers DX is great but I really wish wrangler had better TypeScript support out of the box. The types for env bindings are always wrong.", author: "ts_wizard", source: "github", date: "2026-03-29", sentiment: "mixed", category: "feature_request", insightId: "i2" },
  { id: "f5", text: "Deploying Workers is a breeze compared to other edge platforms. Keep it up!", author: "edge_dev", source: "x", date: "2026-03-26", sentiment: "positive", category: "praise", rating: 5, insightId: "i2" },
  { id: "f6", text: "wrangler dev keeps crashing with the new D1 bindings. Can't reproduce locally at all.", author: "d1_beta_user", source: "github", date: "2026-03-31", sentiment: "negative", category: "bug", insightId: "i2" },
  { id: "f7", text: "DNS propagation took over 30 minutes for a simple A record change. This used to be near-instant. What changed?", author: "webmaster42", source: "support", date: "2026-03-25", sentiment: "negative", category: "complaint", rating: 2, insightId: "i3" },
  { id: "f8", text: "DNS changes are lightning fast. Updated my CNAME and it was live globally in under 60 seconds.", author: "happy_admin", source: "community", date: "2026-03-24", sentiment: "positive", category: "praise", rating: 5, insightId: "i3" },
  { id: "f9", text: "Please add HTTPS record type support in the dashboard. It's 2026 and we still can't add HTTPS/SVCB records via the UI.", author: "dns_nerd", source: "community", date: "2026-03-29", sentiment: "negative", category: "feature_request", insightId: "i3" },
  { id: "f10", text: "Zero Trust Access policies are confusing to set up. The docs don't match the actual UI flow. Had to open 3 support tickets.", author: "security_lead", source: "support", date: "2026-03-28", sentiment: "negative", category: "complaint", rating: 1, insightId: "i4" },
  { id: "f11", text: "Would love to see a step-by-step wizard for setting up Zero Trust for the first time. The current flow is overwhelming.", author: "small_biz_cto", source: "email", date: "2026-03-27", sentiment: "neutral", category: "feature_request", insightId: "i4" },
  { id: "f12", text: "R2 pricing is unbeatable. Migrated 50TB from S3 and saving $2k/month. The egress fees alone make it worth it.", author: "cloud_economist", source: "x", date: "2026-03-30", sentiment: "positive", category: "praise", rating: 5, insightId: "i5" },
  { id: "f13", text: "R2 needs a proper lifecycle policy UI. Right now we have to use the API for everything related to object expiration.", author: "storage_admin", source: "github", date: "2026-03-29", sentiment: "neutral", category: "feature_request", insightId: "i5" },
  { id: "f14", text: "Pages deployment failed silently 3 times today. No error in the UI, no webhook notification, just stuck at 'building'.", author: "jamstack_dev", source: "discord", date: "2026-03-31", sentiment: "negative", category: "bug", rating: 1, insightId: "i6" },
  { id: "f15", text: "Cloudflare Pages + Workers integration is the best full-stack deployment experience I've ever used.", author: "fullstack_fan", source: "x", date: "2026-03-26", sentiment: "positive", category: "praise", rating: 5, insightId: "i6" },
  { id: "f16", text: "The WAF custom rules editor needs regex support for URI path matching. Current string matching is too limited.", author: "appsec_eng", source: "community", date: "2026-03-28", sentiment: "neutral", category: "feature_request", insightId: "i7" },
  { id: "f17", text: "Rate limiting rules saved us from a massive bot attack last week. The analytics were incredibly helpful for tuning thresholds.", author: "incident_resp", source: "email", date: "2026-03-25", sentiment: "positive", category: "praise", rating: 4, insightId: "i7" },
  { id: "f18", text: "API documentation for the v4 endpoints is outdated. Several fields listed in docs don't exist in responses anymore.", author: "api_consumer", source: "github", date: "2026-03-30", sentiment: "negative", category: "bug", insightId: "i8" },
  { id: "f19", text: "The API is rock solid. 99.99% uptime in our monitoring over the past year. Excellent work.", author: "reliability_eng", source: "support", date: "2026-03-27", sentiment: "positive", category: "praise", rating: 5, insightId: "i8" },
];

export const initialInsights: Insight[] = [
  {
    id: "i1", title: "Dashboard Performance Issues",
    topics: [{ label: "Page Load Speed", count: 12 }, { label: "Zone Switching", count: 8 }, { label: "UI Responsiveness", count: 5 }],
    category: "bug", mentions: 25, sources: ["community", "discord", "github", "support"],
    sentimentScore: -0.6, trend: [3, 5, 4, 7, 6, 8, 5], feedbackIds: ["f1", "f2", "f3"],
  },
  {
    id: "i2", title: "Workers Developer Experience",
    topics: [{ label: "TypeScript Support", count: 15 }, { label: "Wrangler CLI", count: 11 }, { label: "D1 Bindings", count: 7 }],
    category: "feature_request", mentions: 33, sources: ["github", "x", "discord"],
    sentimentScore: 0.1, trend: [5, 6, 8, 7, 9, 10, 12], feedbackIds: ["f4", "f5", "f6"],
  },
  {
    id: "i3", title: "DNS Propagation & Record Types",
    topics: [{ label: "Propagation Speed", count: 9 }, { label: "HTTPS Records", count: 6 }, { label: "DNSSEC", count: 3 }],
    category: "feature_request", mentions: 18, sources: ["support", "community"],
    sentimentScore: -0.2, trend: [4, 3, 5, 4, 6, 5, 4], feedbackIds: ["f7", "f8", "f9"],
  },
  {
    id: "i4", title: "Zero Trust Onboarding Complexity",
    topics: [{ label: "Setup Wizard", count: 10 }, { label: "Policy Config", count: 8 }, { label: "Documentation", count: 6 }],
    category: "complaint", mentions: 24, sources: ["support", "email", "community"],
    sentimentScore: -0.7, trend: [6, 7, 8, 9, 8, 10, 11], feedbackIds: ["f10", "f11"],
  },
  {
    id: "i5", title: "R2 Storage Value & Features",
    topics: [{ label: "Pricing", count: 14 }, { label: "Lifecycle Policies", count: 7 }, { label: "S3 Compatibility", count: 5 }],
    category: "praise", mentions: 26, sources: ["x", "github", "community"],
    sentimentScore: 0.6, trend: [8, 9, 10, 11, 12, 13, 15], feedbackIds: ["f12", "f13"],
  },
  {
    id: "i6", title: "Pages Deployment Reliability",
    topics: [{ label: "Build Failures", count: 11 }, { label: "Silent Errors", count: 8 }, { label: "Workers Integration", count: 6 }],
    category: "bug", mentions: 25, sources: ["discord", "x", "github"],
    sentimentScore: -0.3, trend: [5, 7, 6, 8, 7, 9, 6], feedbackIds: ["f14", "f15"],
  },
  {
    id: "i7", title: "WAF & Security Rules Enhancement",
    topics: [{ label: "Custom Rules", count: 9 }, { label: "Rate Limiting", count: 7 }, { label: "Regex Support", count: 5 }],
    category: "feature_request", mentions: 21, sources: ["community", "email"],
    sentimentScore: 0.3, trend: [3, 4, 5, 6, 5, 7, 8], feedbackIds: ["f16", "f17"],
  },
  {
    id: "i8", title: "API Documentation Quality",
    topics: [{ label: "v4 Endpoints", count: 12 }, { label: "Response Schema", count: 8 }, { label: "Reliability", count: 4 }],
    category: "bug", mentions: 24, sources: ["github", "support"],
    sentimentScore: 0.1, trend: [6, 5, 7, 6, 8, 7, 9], feedbackIds: ["f18", "f19"],
  },
];
