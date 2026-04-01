import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SourceIcon } from "@/components/SourceIcon";
import { SentimentBadge, SentimentScore } from "@/components/SentimentBadge";
import type { Insight, FeedbackItem } from "@/data/mock-data";
import { categoryLabels, sourceLabels } from "@/data/mock-data";
import { categoryColors } from "@/data/category-styles";
import { Search, Star, MessageSquare, ClipboardList } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface InsightDetailPanelProps {
  insight: Insight | null;
  feedback: FeedbackItem[];
  open: boolean;
  onClose: () => void;
}

export function InsightDetailPanel({ insight, feedback, open, onClose }: InsightDetailPanelProps) {
  const [search, setSearch] = useState("");

  if (!insight) return null;

  const relatedFeedback = feedback
    .filter((f) => insight.feedbackIds.includes(f.id))
    .filter((f) => !search || f.text.toLowerCase().includes(search.toLowerCase()) || f.author.toLowerCase().includes(search.toLowerCase()));

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl bg-card border-l border-border overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="text-lg text-foreground">{insight.title}</SheetTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Badge className={cn("text-xs rounded-full font-medium px-2.5", categoryColors[insight.category])}>
              {categoryLabels[insight.category]}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare size={12} /> {insight.mentions} mentions
            </span>
            <SentimentScore score={insight.sentimentScore} />
          </div>
        </SheetHeader>

        {/* Topics */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">Topics</h3>
          <div className="flex flex-wrap gap-1.5">
            {insight.topics.map((t) => (
              <Badge key={t.label} variant="outline" className="text-xs bg-secondary/50">
                {t.label} <span className="ml-1 text-muted-foreground">({t.count})</span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Sources */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">Sources</h3>
          <div className="flex gap-2">
            {insight.sources.map((s) => (
              <div key={s} className="flex items-center gap-1 text-xs text-muted-foreground">
                <SourceIcon source={s} size={14} />
                <span>{sourceLabels[s]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Create Survey */}
        <div className="mb-4">
          <Button variant="outline" className="w-full gap-2 border-border text-sm">
            <ClipboardList size={14} />
            Create Survey from Insight
          </Button>
        </div>
        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search feedback..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-secondary/50 border-border"
          />
        </div>

        {/* Feedback list */}
        <div className="space-y-3">
          {relatedFeedback.map((f) => (
            <div key={f.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SourceIcon source={f.source} size={14} />
                  <span className="text-xs font-medium text-foreground">{f.author}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{f.date}</span>
              </div>
              <p className="text-sm text-secondary-foreground leading-relaxed">{f.text}</p>
              <div className="flex items-center justify-between mt-2">
                <SentimentBadge sentiment={f.sentiment} />
                {f.rating && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        className={i < f.rating! ? "text-warning fill-warning" : "text-muted-foreground/30"}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
