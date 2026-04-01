import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect, useRef } from "react";
import { Sparkles, Calendar, RefreshCw, Plus, CheckCircle, Loader2, BarChart2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const filterChips = [
  "Keyword Matches", "Type", "Source Type", "Sources",
  "Company Type", "Company Stage", "Customer Persona", "Company Persona",
];

const STEPS = [
  "Connecting to D1 database…",
  "Fetching feedback items…",
  "Calling Workers AI…",
  "Parsing AI response…",
  "Writing insights to database…",
  "Complete!",
];

interface ProgressStep {
  label: string;
  state: "pending" | "active" | "done";
}

interface AskAIDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AskAIDialog({ open, onClose }: AskAIDialogProps) {
  const [prompt, setPrompt] = useState("What are the top feature requests for product teams?");
  const [insightCount, setInsightCount] = useState([10]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [insightsGenerated, setInsightsGenerated] = useState<number | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const queryClient = useQueryClient();

  const toggleFilter = (f: string) =>
    setActiveFilters((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

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

  const handleStartAnalysis = async () => {
    if (!prompt.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisDone(false);
    setInsightsGenerated(null);
    setSteps(initSteps());

    try {
      const response = await fetch('/api/analyze/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, insightCount: insightCount[0] }),
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
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

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
            queryClient.invalidateQueries({ queryKey: ['insights'] });
            queryClient.invalidateQueries({ queryKey: ['analysisSummary'] });
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
    readerRef.current?.cancel();
    setIsAnalyzing(false);
    setAnalysisDone(false);
    setSteps([]);
    setInsightsGenerated(null);
  };

  useEffect(() => {
    if (!open) dismissProgress();
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <BarChart2 size={16} />
              Generate Insights
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2 overflow-y-auto flex-1">
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
                <Badge variant="outline" className="text-xs bg-secondary/50 border-border cursor-pointer">
                  <Calendar size={12} className="mr-1" />All Time
                </Badge>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-2">Filters</h3>
                <div className="flex flex-wrap gap-1.5">
                  {filterChips.map((chip) => (
                    <Badge
                      key={chip}
                      variant="outline"
                      className={`text-xs cursor-pointer transition-colors ${
                        activeFilters.includes(chip)
                          ? "bg-foreground/10 border-foreground/40 text-foreground"
                          : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => !isAnalyzing && toggleFilter(chip)}
                    >
                      {chip}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Insight count */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Generate <span className="text-primary">{insightCount[0]}</span> insights
                </h3>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7 border-border" disabled={isAnalyzing}>
                    <Plus size={14} />
                  </Button>
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
      {steps.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-xl border border-border bg-popover shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-primary" />
              <span className="text-xs font-semibold text-foreground">Workers AI</span>
            </div>
            {analysisDone && (
              <button onClick={dismissProgress} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {step.state === "done" ? (
                  <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                ) : step.state === "active" ? (
                  <Loader2 size={14} className="text-white animate-spin shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                )}
                <span
                  className={
                    step.state === "done"
                      ? "text-xs text-foreground font-medium"
                      : step.state === "active"
                        ? "text-xs text-white font-semibold"
                        : "text-xs text-muted-foreground/50"
                  }
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {analysisDone && insightsGenerated !== null && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-emerald-400">
                ✓ {insightsGenerated} insights generated and saved to D1
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
