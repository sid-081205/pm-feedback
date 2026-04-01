import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { Sparkles, Calendar, SlidersHorizontal, RefreshCw, Plus } from "lucide-react";

const filterChips = [
  "Keyword Matches",
  "Type",
  "Source Type",
  "Sources",
  "Company Type",
  "Company Stage",
  "Customer Persona",
  "Company Persona",
];

interface AskAIDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AskAIDialog({ open, onClose }: AskAIDialogProps) {
  const [prompt, setPrompt] = useState("What are the top feature requests for product teams?");
  const [insightCount, setInsightCount] = useState([10]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Sparkles size={16} />
            Explore Insights
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Prompt */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Prompt Instructions</h3>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-secondary/50 border-border text-sm min-h-[80px] resize-y"
              placeholder="Ask a question about your feedback..."
            />
          </div>

          <div className="h-px bg-border" />

          {/* Date Range */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Date Range</h3>
            <Badge variant="outline" className="text-xs bg-secondary/50 border-border cursor-pointer">
              <Calendar size={12} className="mr-1" />
              All Time
            </Badge>
          </div>

          <div className="h-px bg-border" />

          {/* Filters */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Filters</h3>
            <div className="flex flex-wrap gap-2">
              {filterChips.map((chip) => (
                <Badge
                  key={chip}
                  variant="outline"
                  className={`text-xs cursor-pointer transition-colors ${
                    activeFilters.includes(chip)
                      ? "bg-foreground/10 border-foreground/40 text-foreground"
                      : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => toggleFilter(chip)}
                >
                  {chip}
                </Badge>
              ))}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Insight count slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                Summarize feedback into{" "}
                <span className="text-primary">{insightCount[0]}</span> insights
              </h3>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7 border-border">
                  <Plus size={14} />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7 border-border">
                  <RefreshCw size={14} />
                </Button>
              </div>
            </div>
            <Slider
              value={insightCount}
              onValueChange={setInsightCount}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">← High-level</span>
              <span className="text-[10px] text-muted-foreground">Granular →</span>
            </div>
          </div>

          {/* Action */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              {/* Placeholder count */}
              <span className="text-primary">574</span> highlights included in analysis
            </span>
            <Button className="gap-2">
              <Sparkles size={14} />
              Start New Analysis
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}