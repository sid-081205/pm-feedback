import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect, useRef } from "react";
import { Sparkles, Calendar, RefreshCw, CheckCircle, Loader2, BarChart2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { setLatestAnalysisRunId } from "@/lib/analysis-dialog-store";

type SourceFilter = "all" | "discord" | "github" | "x" | "support" | "email" | "community";
type CategoryFilter = "all" | "feature_request" | "bug" | "praise" | "complaint" | "question";
type DateRangeFilter = "all" | "7d" | "30d";

const STEPS = [
  "Connecting to D1…",
  "Fetching filtered feedback…",
  "Calling Workers AI…",
  "Writing insights to D1…",
  "Complete!",
];

interface ProgressStep {
  label: string;
  state: "pending" | "active" | "done";
}

interface AskAIDialogProps {
  open: boolean;
  onClose: () => void;
  onRunCompleted?: (runId: string) => void;
}

export function AskAIDialog({ open, onClose, onRunCompleted }: AskAIDialogProps) {
  const [prompt, setPrompt] = useState("What are the top feature requests for product teams?");
  const [insightCount, setInsightCount] = useState([10]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [insightsGenerated, setInsightsGenerated] = useState<number | null>(null);
  const [popupVisible, setPopupVisible] = useState(true);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const queryClient = useQueryClient();

  const initSteps = () =>
    STEPS.map((label, i) => ({ label, state: i === 0 ? "active" : "pending" } as ProgressStep));

  const advanceStep = (stepIndex: number, label?: string) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i < stepIndex) return { ...s, state: "done" };
        if (i === stepIndex) return { label: label ?? s.label, state: "active" };
        return s;
      })
    );
  };

  const completeAll = () => {
    setSteps((prev) => prev.map((s) => ({ ...s, state: "done" })));
  };

  const buildFilters = () => {
    const filters: Record<string, unknown> = {};

    if (sourceFilter !== "all") {
      filters.sources = [sourceFilter];
    }

    if (categoryFilter !== "all") {
      filters.category = categoryFilter;
    }

    if (dateRange !== "all") {
      const now = new Date();
      const days = dateRange === "7d" ? 7 : 30;
      const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filters.since = since.toISOString();
      filters.until = now.toISOString();
    }

    return filters;
  };

  const handleStartAnalysis = async () => {
    if (!prompt.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisDone(false);
    setInsightsGenerated(null);
    setSteps(initSteps());
    setPopupVisible(true);

    try {
      const response = await fetch('/api/analyze/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          insightCount: insightCount[0],
          filters: buildFilters(),
        }),
      });

      if (!response.body) throw new Error('No response stream');

      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          let event: any;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (event.error) {
            toast.error(`Analysis failed: ${event.error}`);
            setIsAnalyzing(false);
            return;
          }

          if (event.step !== undefined) {
            advanceStep(event.step, event.label);
          }

          if (event.done) {
            completeAll();
            setInsightsGenerated(event.insightsCount ?? insightCount[0]);
            setAnalysisDone(true);
            setIsAnalyzing(false);
            queryClient.invalidateQueries({ queryKey: ["insights"] });
            queryClient.invalidateQueries({ queryKey: ["analysisSummary"] });
            if (event.runId) {
              setLatestAnalysisRunId(event.runId);
              onRunCompleted?.(event.runId);
            }
            toast.success(`${event.insightsCount} insights generated`);
          }
        }
      }
    } catch (err: any) {
      toast.error(`Analysis failed: ${err.message || 'Unknown error'}`);
      setIsAnalyzing(false);
    }
  };

  const dismissProgress = () => {
    setPopupVisible(false);
  };

  const dateLabel = () => {
    if (dateRange === "7d") return "Last 7 days";
    if (dateRange === "30d") return "Last 30 days";
    return "All time";
  };

  useEffect(() => {
    if (!open && !isAnalyzing && !analysisDone) dismissProgress();
  }, [open, isAnalyzing, analysisDone]);

  useEffect(() => {
    return () => {
      readerRef.current?.cancel().catch(() => undefined);
    };
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <BarChart2 size={16} />
              Generate Insights
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2 overflow-y-auto flex-1 min-h-0 pr-1">
            {/* Prompt */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Prompt</h3>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-secondary/50 border-border text-sm min-h-[72px] resize-none"
                placeholder="e.g. What are the top feature requests from enterprise customers?"
                disabled={isAnalyzing}
              />
            </div>

            <div className="h-px bg-border" />

            {/* Date + Filters */}
            <div className="flex flex-wrap items-start gap-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Date Range</h3>
                <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeFilter)}>
                  <SelectTrigger className="w-[160px] h-8 text-xs bg-secondary/50 border-border">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-2">Filters</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
                    <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sources</SelectItem>
                      <SelectItem value="discord">Discord</SelectItem>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="x">X / Twitter</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
                    <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      <SelectItem value="feature_request">Feature request</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="praise">Praise</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] bg-secondary/50 border-border">
                <Calendar size={11} className="mr-1" />
                {dateLabel()}
              </Badge>
              {sourceFilter !== "all" && (
                <Badge variant="outline" className="text-[10px] bg-secondary/50 border-border">Source: {sourceFilter}</Badge>
              )}
              {categoryFilter !== "all" && (
                <Badge variant="outline" className="text-[10px] bg-secondary/50 border-border">Category: {categoryFilter}</Badge>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Insight count */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Generate <span className="text-primary">{insightCount[0]}</span> insights
                </h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline" size="icon" className="h-7 w-7 border-border" disabled={isAnalyzing}
                    onClick={() => setPrompt("What are the top feature requests for product teams?")}
                  >
                    <RefreshCw size={14} />
                  </Button>
                </div>
              </div>
              <Slider value={insightCount} onValueChange={setInsightCount} min={1} max={50} step={1} disabled={isAnalyzing} />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">← High-level</span>
                <span className="text-[10px] text-muted-foreground">Granular →</span>
              </div>
            </div>

            {/* Action */}
            <Button
              className="w-full gap-2"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing || !prompt.trim()}
            >
              {isAnalyzing
                ? <Loader2 size={14} className="animate-spin" />
                : analysisDone
                  ? <CheckCircle size={14} />
                  : <Sparkles size={14} />}
              {isAnalyzing
                ? "Analyzing…"
                : analysisDone
                  ? `Done — ${insightsGenerated} insights saved`
                  : "Generate Insights"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom-right progress popup — only shown while running */}
      {steps.length > 0 && popupVisible && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] rounded-2xl border-2 border-cyan-400/70 bg-slate-950/95 shadow-[0_20px_60px_rgba(6,182,212,0.22)] p-4 backdrop-blur-md">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-cyan-300" />
                <span className="text-xs font-bold tracking-wide text-cyan-100 uppercase">Workers AI workflow</span>
              </div>
              <p className="mt-1 text-[11px] text-cyan-100/70">Analysis is running in the background. You can close the dialog and keep working.</p>
            </div>
            <button onClick={dismissProgress} className="text-cyan-100/70 hover:text-cyan-100 transition-colors p-0.5">
                <X size={13} />
            </button>
          </div>

          <div className="space-y-2.5">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {step.state === "done" ? (
                  <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                ) : step.state === "active" ? (
                  <Loader2 size={14} className="text-cyan-300 animate-spin shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-cyan-300/40 shrink-0" />
                )}
                <span
                  className={
                    step.state === "done"
                      ? "text-xs text-cyan-50 font-medium"
                      : step.state === "active"
                        ? "text-xs text-cyan-100 font-semibold"
                        : "text-xs text-cyan-100/50"
                  }
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {analysisDone && insightsGenerated !== null && popupVisible && (
            <div className="mt-3 pt-3 border-t border-cyan-400/30">
              <p className="text-xs font-semibold text-emerald-300">
                ✓ {insightsGenerated} insights generated and saved to D1
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
