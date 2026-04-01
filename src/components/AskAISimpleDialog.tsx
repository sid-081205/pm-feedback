import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { Sparkles, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { SentimentBadge } from "@/components/SentimentBadge";
import { SourceIcon } from "@/components/SourceIcon";
import type { Sentiment, Source } from "@/data/mock-data";

interface AskResult {
  answer: string;
  sources: Array<{
    id: string; source: string; text: string;
    author: string; date: string; sentiment: string;
  }>;
}

interface AskAISimpleDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AskAISimpleDialog({ open, onClose }: AskAISimpleDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) { setResult(null); setIsLoading(false); }
  }, [open]);

  const handleAsk = async () => {
    const q = prompt.trim();
    if (!q) return;
    setIsLoading(true);
    setResult(null);
    try {
      const data: AskResult = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: q }),
      }).then((r) => r.json());

      if ((data as any).error) throw new Error((data as any).error);
      setResult(data);
    } catch (err: any) {
      toast.error(`Ask failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAsk();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <MessageSquare size={16} />
            Ask AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-secondary/50 border-border text-sm min-h-[80px] resize-none"
            placeholder="Ask anything about your feedback… e.g. 'What are users saying about performance?'"
            disabled={isLoading}
            autoFocus
          />
          <p className="text-[10px] text-muted-foreground">
            Uses Vectorize semantic search + Workers AI to answer from your feedback data. ⌘↵ to submit.
          </p>
          <Button onClick={handleAsk} disabled={isLoading || !prompt.trim()} className="w-full gap-2">
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {isLoading ? 'Searching…' : 'Ask'}
          </Button>
        </div>

        {result && (
          <ScrollArea className="flex-1 mt-2">
            <div className="space-y-4 pr-1">
              {/* Answer */}
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={12} className="text-primary" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">AI Answer</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.answer}</p>
              </div>

              {/* Sources */}
              {result.sources?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Sources ({result.sources.length})
                  </p>
                  <div className="space-y-2">
                    {result.sources.map((s) => (
                      <div key={s.id} className="rounded border border-border bg-background p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <SourceIcon source={s.source as Source} size={12} />
                            <span className="text-xs font-medium text-foreground">{s.author}</span>
                          </div>
                          <SentimentBadge sentiment={(s.sentiment as Sentiment) || 'neutral'} />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
