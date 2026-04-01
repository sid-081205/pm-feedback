import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SourceIcon } from "@/components/SourceIcon";
import { SentimentScore } from "@/components/SentimentBadge";
import { SparkLine } from "@/components/SparkLine";
import { InsightDetailPanel } from "@/components/InsightDetailPanel";
import { AskAIDialog } from "@/components/AskAIDialog";
import { initialInsights, initialFeedback, categoryLabels, type Insight, type Source, type Category } from "@/data/mock-data";
import { categoryColors } from "@/data/category-styles";
import { Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [askAIOpen, setAskAIOpen] = useState(false);

  const filteredInsights = useMemo(() => {
    return initialInsights.filter((insight) => {
      const matchSearch = !search || insight.title.toLowerCase().includes(search.toLowerCase()) ||
        insight.topics.some((t) => t.label.toLowerCase().includes(search.toLowerCase()));
      const matchSource = sourceFilter === "all" || insight.sources.includes(sourceFilter as Source);
      const matchCategory = categoryFilter === "all" || insight.category === categoryFilter;
      return matchSearch && matchSource && matchCategory;
    });
  }, [search, sourceFilter, categoryFilter]);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Insights</h1>
          <p className="text-sm text-muted-foreground">Aggregated themes from product feedback across all channels</p>
        </div>
        <Button variant="outline" className="gap-2 border-border" onClick={() => setAskAIOpen(true)}>
          <Sparkles size={14} />
          Ask AI
        </Button>
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
              <TableHead className="text-xs font-semibold text-muted-foreground text-center">Mentions</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Sources</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Trend</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-right">Sentiment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInsights.map((insight) => (
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
                <TableCell className="text-center text-sm text-muted-foreground font-mono">{insight.mentions}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {insight.sources.map((s) => (
                      <SourceIcon key={s} source={s} size={14} />
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <SparkLine data={insight.trend} />
                </TableCell>
                <TableCell className="text-right">
                  <SentimentScore score={insight.sentimentScore} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <InsightDetailPanel
        insight={selectedInsight}
        feedback={initialFeedback}
        open={!!selectedInsight}
        onClose={() => setSelectedInsight(null)}
      />

      <AskAIDialog open={askAIOpen} onClose={() => setAskAIOpen(false)} />
    </div>
  );
};

export default Index;
