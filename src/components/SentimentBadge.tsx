import type { Sentiment } from "@/data/mock-data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const sentimentStyles: Record<Sentiment, string> = {
  positive: "border border-green-500/40 bg-green-500/15 text-green-600 dark:text-green-400",
  negative: "border border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-400",
  neutral:  "border border-muted-foreground/30 bg-muted text-muted-foreground",
  mixed:    "border border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium rounded-full px-2.5", sentimentStyles[sentiment])}>
      {sentiment}
    </Badge>
  );
}

export function SentimentScore({ score, label }: { score: number; label?: Sentiment }) {
  const sentiment: Sentiment = label ?? (score > 0.2 ? "positive" : score < -0.2 ? "negative" : "neutral");
  return <SentimentBadge sentiment={sentiment} />;
}
