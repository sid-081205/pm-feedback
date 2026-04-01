import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SourceIcon } from "@/components/SourceIcon";
import { SentimentBadge } from "@/components/SentimentBadge";
import type { FeedbackItem } from "@/data/mock-data";
import { sourceLabels, categoryLabels } from "@/data/mock-data";
import { categoryColors } from "@/data/category-styles";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackDetailPanelProps {
  feedback: FeedbackItem | null;
  open: boolean;
  onClose: () => void;
}

export function FeedbackDetailPanel({ feedback, open, onClose }: FeedbackDetailPanelProps) {
  if (!feedback) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-card border-l border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground">Feedback Detail</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <SourceIcon source={feedback.source} size={18} />
            <span className="text-sm font-medium">{sourceLabels[feedback.source]}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("text-xs rounded-full font-medium px-2.5", categoryColors[feedback.category])}>
              {categoryLabels[feedback.category]}
            </Badge>
            <SentimentBadge sentiment={feedback.sentiment} />
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-sm text-foreground leading-relaxed">{feedback.text}</p>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>By <span className="text-foreground font-medium">{feedback.author}</span></span>
            <span>{feedback.date}</span>
          </div>

          {feedback.rating && (
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={i < feedback.rating! ? "text-warning fill-warning" : "text-muted-foreground/30"}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
