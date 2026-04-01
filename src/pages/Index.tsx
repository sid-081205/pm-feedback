import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SourceIcon } from "@/components/SourceIcon";
import { SentimentBadge } from "@/components/SentimentBadge";
import { SparkLine } from "@/components/SparkLine";
import { InsightDetailPanel } from "@/components/InsightDetailPanel";
import { AskAIDialog } from "@/components/AskAIDialog";
import { AskAISimpleDialog } from "@/components/AskAISimpleDialog";
import { useInsights } from "@/hooks/use-insights";
import { useFeedback } from "@/hooks/use-feedback";
import { categoryLabels, type Insight, type Sentiment } from "@/data/mock-data";
import { categoryColors } from "@/data/category-styles";
import { Search, Sparkles, BarChart2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

function ScoreCell({ score }: { score: number }) {
  return (
    <span className="font-mono text-xs text-muted-foreground">
      {score}
    </span>
  );
}

const URGENCY_TOOLTIP = "Urgency (0–100) is derived from: frequency velocity, source diversity, sentiment intensity, keyword signals, and event correlation.";
const VALUE_TOOLTIP = "Value (0–100) is derived from: impact breadth, segment weight, revenue keywords, effort estimate, and unique author ratio.";
const SENTIMENT_TOOLTIP = "Sentiment is calculated with Workers AI using @cf/meta/llama-3.1-8b-instruct.";

const Index = () => {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [askAIOpen, setAskAIOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const { data: apiData, isLoading } = useInsights({
    search,
    source: sourceFilter,
    category: categoryFilter,
    runId: activeRunId ?? undefined,
  });
  const { data: feedbackData } = useFeedback();

  const insights = apiData?.insights ?? [];

  const allFeedback = feedbackData?.feedback ?? [];

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Insights</h1>
          <p className="text-sm text-muted-foreground">Aggregated themes from product feedback across all channels</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 border-border" onClick={() => setAskAIOpen(true)}>
            <Sparkles size={14} />
            Ask AI
          </Button>
          <Button className="gap-2" onClick={() => setGenerateOpen(true)}>
            <BarChart2 size={14} />
            Generate Insights
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search insights..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm bg-secondary/50 border-border"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[150px] h-9 text-sm bg-secondary/50 border-border">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="discord">Discord</SelectItem>
            <SelectItem value="github">GitHub</SelectItem>
            <SelectItem value="x">X / Twitter</SelectItem>
            <SelectItem value="support">Support</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="community">Community</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-9 text-sm bg-secondary/50 border-border">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="feature_request">Feature Request</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="praise">Praise</SelectItem>
            <SelectItem value="complaint">Complaint</SelectItem>
            <SelectItem value="question">Question</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-muted-foreground">Insight</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Topics</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Category</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-center">
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1 mx-auto cursor-help">
                    Urgency <Info size={11} className="text-muted-foreground/60" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">{URGENCY_TOOLTIP}</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-center">
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1 mx-auto cursor-help">
                    Value <Info size={11} className="text-muted-foreground/60" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">{VALUE_TOOLTIP}</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1 cursor-help">
                    Sentiment <Info size={11} className="text-muted-foreground/60" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">{SENTIMENT_TOOLTIP}</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !apiData ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border">
                  <TableCell colSpan={7}>
                    <div className="h-4 bg-secondary/50 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : insights.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-14 text-center text-sm text-muted-foreground">
                  No insights yet. Generate a new run to populate this view.
                </TableCell>
              </TableRow>
            ) : (
              insights.map((insight) => (
                <TableRow
                  key={insight.id}
                  className="cursor-pointer border-b border-border hover:bg-secondary/50 transition-colors"
                  onClick={() => setSelectedInsight(insight)}
                >
                  <TableCell className="font-medium text-foreground">{insight.title}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {insight.topics.slice(0, 2).map((t) => (
                        <Badge key={t.label} variant="outline" className="text-[10px] bg-secondary/50 border-border text-muted-foreground">
                          {t.label}
                        </Badge>
                      ))}
                      {insight.topics.length > 2 && (
                        <Badge variant="outline" className="text-[10px] bg-secondary/50 border-border text-muted-foreground">
                          +{insight.topics.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px] rounded-full font-medium px-2.5", categoryColors[insight.category])}>
                      {categoryLabels[insight.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {insight.urgency_score != null
                      ? <ScoreCell score={insight.urgency_score} />
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {insight.value_score != null
                      ? <ScoreCell score={insight.value_score} />
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    {insight.sentiment_label
                      ? <SentimentBadge sentiment={insight.sentiment_label as Sentiment} />
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    <SparkLine data={insight.trend} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InsightDetailPanel
        insight={selectedInsight}
        feedback={allFeedback}
        open={!!selectedInsight}
        onClose={() => setSelectedInsight(null)}
      />

      <AskAISimpleDialog open={askAIOpen} onClose={() => setAskAIOpen(false)} />
      <AskAIDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onRunCompleted={(runId) => {
          setActiveRunId(runId);
          setSelectedInsight(null);
        }}
      />
    </div>
  );
};

export default Index;
