import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, TrendingUp, Users, Zap, Calendar, ArrowUpRight, Loader2, Info } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { useAnalysisSummary } from "@/hooks/use-analysis-summary";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  feature_request: "hsl(var(--primary))",
  bug: "hsl(var(--destructive))",
  praise: "hsl(142 76% 36%)",
  complaint: "hsl(var(--warning))",
  question: "hsl(var(--muted-foreground))",
};

const CATEGORY_LABELS: Record<string, string> = {
  feature_request: "Feature Request",
  bug: "Bug",
  praise: "Praise",
  complaint: "Complaint",
  question: "Question",
};

const INDUSTRY_LABELS: Record<string, string> = {
  saas: "SaaS", finance: "Finance", gaming: "Gaming", media: "Media",
  e_commerce: "E-Commerce", healthcare: "Healthcare", education: "Education", unknown: "Other",
};

const SIZE_LABELS: Record<string, string> = {
  "1-10": "Startup (1–10)", "11-50": "Small (11–50)", "51-200": "Mid-Market (51–200)",
  "201-1000": "Growth (201–1k)", "1000+": "Enterprise (1k+)", unknown: "Unknown size",
};

const TIER_LABELS: Record<string, string> = {
  free: "Free", pro: "Pro", enterprise: "Enterprise", unknown: "Unknown tier",
};

const EVENT_TYPE_STYLES: Record<string, string> = {
  incident: "bg-destructive/20 text-destructive border-destructive/30",
  launch:   "bg-success/20 text-success border-success/30",
  blog:     "bg-primary/20 text-primary border-primary/30",
  other:    "bg-muted text-muted-foreground border-border",
};

function formatDay(day: string) {
  try { return new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return day; }
}

function formatDateTime(dt: string) {
  try { return new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return dt; }
}

function CategoryPill({ category, count }: { category: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-secondary/50 border-border text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: CATEGORY_COLORS[category] ?? "currentColor" }} />
      {CATEGORY_LABELS[category] ?? category} {count}
    </span>
  );
}

// ── Trends Panel ──────────────────────────────────────────────────────────────
function TrendsPanel({ trends }: { trends: any[] }) {
  if (!trends || trends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-sm text-muted-foreground">
        <TrendingUp size={28} className="text-muted-foreground/30" />
        <p>No feedback data yet. Add feedback to see trends.</p>
      </div>
    );
  }

  const chartData = trends.map((d) => ({ ...d, day: formatDay(d.day) }));
  const totals = Object.keys(CATEGORY_LABELS).reduce((acc, cat) => {
    acc[cat] = trends.reduce((sum, d) => sum + (d[cat] ?? 0), 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
          <Card key={cat} className="bg-secondary/30 border-border">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[cat] }} />
                <div className="text-[10px] text-muted-foreground truncate">{label}</div>
              </div>
              <div className="text-2xl font-bold text-foreground font-mono">{totals[cat]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border border-border p-4 bg-card">
        <h3 className="text-xs font-semibold text-muted-foreground mb-4">Feedback volume by category over time</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(v) => CATEGORY_LABELS[v] ?? v} />
            {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
              <Area key={cat} type="monotone" dataKey={cat} stackId="1" stroke={color} fill={color} fillOpacity={0.4} strokeWidth={1.5} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Segments Panel ────────────────────────────────────────────────────────────
function SegmentsPanel({ segments }: { segments: any[] }) {
  const [generated, setGenerated] = useState(false);
  const { data: summary, isFetching, refetch } = useAnalysisSummary();

  const segs = generated ? (summary?.segments ?? segments) : segments;

  if (!generated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Users size={36} className="text-muted-foreground/30" />
        <div className="text-center max-w-sm">
          <p className="text-sm font-medium text-foreground mb-1">Customer Segment Analysis</p>
          <p className="text-xs text-muted-foreground mb-5">
            Groups your feedback by customer type — industry, company size, and plan tier — so you can see which segments are reporting the most bugs, requesting the most features, or generating the most praise.
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => { refetch(); setGenerated(true); }}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Generate Segment Analysis
        </Button>
      </div>
    );
  }

  if (!segs || segs.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No segment data. Add feedback with industry/company info to see segments.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {segs.map((seg: any) => {
        const parts = seg.segment_key.split("|").reduce((acc: any, p: string) => {
          const [k, v] = p.split("=");
          acc[k] = v;
          return acc;
        }, {} as Record<string, string>);

        const industry = INDUSTRY_LABELS[parts.industry] ?? parts.industry;
        const size = SIZE_LABELS[parts.size] ?? parts.size;
        const tier = TIER_LABELS[parts.tier] ?? parts.tier;
        const personaTitle = [industry, size, tier].filter(Boolean).join(" · ");

        const sorted = Object.entries(seg.by_category)
          .sort(([, a], [, b]) => (b as number) - (a as number)) as [string, number][];
        const topCat = sorted[0];
        const totalFeedback = sorted.reduce((s, [, v]) => s + (v as number), 0);

        // Bar widths relative to max category
        const maxCount = topCat ? topCat[1] : 1;

        return (
          <Card key={seg.segment_key} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Left: persona info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{personaTitle}</span>
                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border">
                      {totalFeedback} items
                    </Badge>
                  </div>

                  {/* Category bars */}
                  <div className="space-y-1.5 mb-3">
                    {sorted.filter(([, v]) => (v as number) > 0).map(([cat, count]) => (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-24 shrink-0">{CATEGORY_LABELS[cat] ?? cat}</span>
                        <div className="flex-1 h-2 bg-secondary/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round(((count as number) / maxCount) * 100)}%`,
                              background: CATEGORY_COLORS[cat] ?? "hsl(var(--primary))",
                              opacity: 0.7,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground w-4 text-right shrink-0">{count as number}</span>
                      </div>
                    ))}
                  </div>

                  {/* Top insights if available */}
                  {seg.top_insights?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">AI-linked insights</p>
                      <div className="space-y-0.5">
                        {seg.top_insights.slice(0, 3).map((ins: any) => (
                          <div key={ins.id} className="flex items-center justify-between text-xs">
                            <span className="text-foreground truncate mr-2">{ins.title}</span>
                            <span className="text-muted-foreground font-mono shrink-0">×{ins.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: dominant category */}
                {topCat && (
                  <div className="text-right shrink-0 pl-4 border-l border-border">
                    <div className="text-2xl font-bold font-mono text-foreground">{topCat[1]}</div>
                    <div className="text-[10px] text-muted-foreground">{CATEGORY_LABELS[topCat[0]] ?? topCat[0]}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Events Panel ──────────────────────────────────────────────────────────────
function EventsPanel({ correlations }: { correlations: any[] }) {
  const [generated, setGenerated] = useState(false);
  const { data: summary, isFetching, refetch } = useAnalysisSummary();

  const corrs = generated ? (summary?.correlations ?? correlations) : correlations;

  return (
    <div className="space-y-4">
      {/* Explanation banner */}
      <div className="rounded-lg border border-border bg-secondary/20 p-4 flex gap-3">
        <Info size={16} className="text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Why event correlation matters: </span>
          Product events — outages, launches, blog posts — directly influence user sentiment and feedback volume.
          By correlating feedback timestamps against known events, you can tell whether a spike in complaints is
          a reaction to an incident, or whether a feature launch is actually generating praise. This separates
          signal from noise and prevents acting on feedback that was triggered by temporary circumstances.
        </div>
      </div>

      {!generated ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Zap size={36} className="text-muted-foreground/30" />
          <div className="text-center max-w-sm">
            <p className="text-sm font-medium text-foreground mb-1">Event Correlation Analysis</p>
            <p className="text-xs text-muted-foreground mb-5">
              Maps feedback volume spikes to product events (incidents, launches, releases) to surface causality.
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => { refetch(); setGenerated(true); }}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Generate Correlation Analysis
          </Button>
        </div>
      ) : !corrs || corrs.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          No events found. Events can be added via the API.
        </div>
      ) : (
        <div className="space-y-3">
          {corrs.map((corr: any) => (
            <Card key={corr.event.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("shrink-0 text-[10px] font-semibold px-2 py-1 rounded border uppercase tracking-wide", EVENT_TYPE_STYLES[corr.event.type] ?? EVENT_TYPE_STYLES.other)}>
                    {corr.event.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">{corr.event.title}</h3>
                      <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDateTime(corr.event.start_time)}
                        {corr.event.end_time && <span> – {formatDateTime(corr.event.end_time)}</span>}
                      </span>
                    </div>
                    {corr.event.description && (
                      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{corr.event.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="text-[10px] text-muted-foreground font-medium">{corr.feedback_in_window} feedback in window:</span>
                      {Object.entries(corr.window_breakdown ?? {})
                        .filter(([, v]) => (v as number) > 0)
                        .map(([cat, count]) => <CategoryPill key={cat} category={cat} count={count as number} />)}
                    </div>
                    {corr.notes && <p className="text-xs text-foreground/70 mb-2 italic">{corr.notes}</p>}
                    {corr.related_insights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] text-muted-foreground font-medium">AI-correlated insights:</span>
                        {corr.related_insights.map((ins: any) => (
                          <Badge key={ins.id} variant="outline" className="text-[10px] bg-secondary/50 border-border gap-1">
                            {ins.title}<span className="text-muted-foreground">×{ins.count}</span><ArrowUpRight size={9} />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const Analysis = () => {
  const { data: summary, isLoading } = useAnalysisSummary();

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Trends, customer segments, and event correlations derived from your feedback data
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-md px-3 py-2">
          <Sparkles size={12} />
          <span>Powered by Workers AI</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[200, 240, 200].map((h, i) => (
            <div key={i} className="bg-secondary/30 rounded-lg animate-pulse" style={{ height: h }} />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="trends">
          <TabsList className="mb-6 bg-secondary/50 border border-border">
            <TabsTrigger value="trends" className="gap-1.5 text-xs">
              <TrendingUp size={13} /> Trends
            </TabsTrigger>
            <TabsTrigger value="segments" className="gap-1.5 text-xs">
              <Users size={13} /> Customer Segments
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-1.5 text-xs">
              <Zap size={13} /> Event Correlation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <TrendsPanel trends={summary?.trends ?? []} />
          </TabsContent>
          <TabsContent value="segments">
            <SegmentsPanel segments={summary?.segments ?? []} />
          </TabsContent>
          <TabsContent value="events">
            <EventsPanel correlations={summary?.correlations ?? []} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Analysis;
