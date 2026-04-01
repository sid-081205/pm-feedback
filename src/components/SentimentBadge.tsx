import type { Sentiment } from "@/data/mock-data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const sentimentStyles: Record<Sentiment, string> = {
  positive: "border border-foreground/30 bg-foreground/15 text-foreground",
  negative: "border border-foreground/20 bg-foreground/10 text-foreground",
  neutral: "border border-muted-foreground/30 bg-muted text-muted-foreground",
  mixed: "border border-foreground/20 bg-foreground/10 text-foreground",
};

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium rounded-full px-2.5", sentimentStyles[sentiment])}>
      {sentiment}
    </Badge>
  );
}

export function SentimentScore({ score }: { score: number }) {
  const label = score > 0 ? `+${(score * 100).toFixed(0)}` : `${(score * 100).toFixed(0)}`;
  return <span className="font-mono text-sm font-bold text-foreground">{label}</span>;
}
