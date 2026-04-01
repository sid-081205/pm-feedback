import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SourceIcon } from "@/components/SourceIcon";
import { FeedbackDetailPanel } from "@/components/FeedbackDetailPanel";
import { useFeedback, useAddFeedback, useSeedFeedback } from "@/hooks/use-feedback";
import { sourceLabels, categoryLabels, type FeedbackItem, type Source, type Category } from "@/data/mock-data";
import { categoryColors } from "@/data/category-styles";
import { Plus, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { setLatestAnalysisRunId } from "@/lib/analysis-dialog-store";

const Data = () => {
  const [search, setSearch] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [seedExhausted, setSeedExhausted] = useState(false);

  // Form state — no sentiment, AI calculates it
  const [newSource, setNewSource] = useState<Source>("support");
  const [newText, setNewText] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("feature_request");

  const { data: apiData, isLoading } = useFeedback({ search });
  const addFeedback = useAddFeedback();
  const seedFeedback = useSeedFeedback();

  const feedback: FeedbackItem[] = apiData?.feedback ?? [];

  const handleAddFeedback = async () => {
    if (!newText.trim() || !newAuthor.trim()) {
      toast.error("Feedback text and author are required");
      return;
    }
    try {
      await addFeedback.mutateAsync({
        source: newSource,
        text: newText,
        author: newAuthor,
        category: newCategory,
      });
      toast.success("Feedback added to D1");
      setNewText("");
      setNewAuthor("");
      setNewSource("support");
      setNewCategory("feature_request");
      setDialogOpen(false);
    } catch {
      toast.error("Failed to add feedback");
    }
  };

  const handleSeed = async () => {
    try {
      const result = await seedFeedback.mutateAsync();
      if (result.exhausted && result.inserted === 0) {
        setSeedExhausted(true);
        toast.info("All 100 seed items have been added");
      } else {
        toast.success(`Added ${result.inserted} items · ${result.remaining} remaining`);
        if (result.exhausted) setSeedExhausted(true);
      }
    } catch {
      toast.error("Failed to seed feedback");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Raw Feedback</h1>
          <p className="text-sm text-muted-foreground">{feedback.length} entries from all sources</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              if (!window.confirm("Reset all D1 data? This removes feedback, insights, runs, and related analysis tables.")) return;
              try {
                const response = await fetch('/api/feedback/reset', { method: 'POST' });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload?.error || payload?.detail || 'Reset failed');
                setLatestAnalysisRunId(null);
                toast.success("D1 reset complete");
                window.location.reload();
              } catch (err: any) {
                toast.error(err.message || "Failed to reset D1");
              }
            }}
          >
            Reset D1
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-border"
            disabled={seedFeedback.isPending || seedExhausted}
            onClick={handleSeed}
          >
            <Sparkles size={14} />
            {seedExhausted ? "No More Remaining" : seedFeedback.isPending ? "Adding…" : "Add 10 Seed Items"}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus size={14} />
                Add Feedback
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add Feedback</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Source</label>
                  <Select value={newSource} onValueChange={(v) => setNewSource(v as Source)}>
                    <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(sourceLabels) as Source[]).map((s) => (
                        <SelectItem key={s} value={s}>{sourceLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Feedback</label>
                  <Textarea value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="Enter feedback text..." className="bg-secondary/50 border-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Author</label>
                    <Input value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} placeholder="Username" className="bg-secondary/50 border-border" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                    <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Category)}>
                      <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(categoryLabels) as Category[]).map((c) => (
                          <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">Sentiment is calculated automatically by Workers AI after submission.</p>
                <Button onClick={handleAddFeedback} disabled={addFeedback.isPending} className="w-full">
                  {addFeedback.isPending ? "Adding..." : "Add to D1"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search feedback..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm bg-secondary/50 border-border"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-muted-foreground w-10">Source</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Feedback</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Author</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Date</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !apiData ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border">
                  <TableCell colSpan={5}>
                    <div className="h-4 bg-secondary/50 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : feedback.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                  No feedback yet. Add feedback or seed items to get started.
                </TableCell>
              </TableRow>
            ) : (
              feedback.map((f) => (
                <TableRow
                  key={f.id}
                  className="cursor-pointer border-b border-border hover:bg-secondary/50 transition-colors"
                  onClick={() => setSelectedFeedback(f)}
                >
                  <TableCell><SourceIcon source={f.source} size={16} /></TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-foreground truncate">{f.text}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.author}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{f.date}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px] rounded-full font-medium px-2.5", categoryColors[f.category])}>
                      {categoryLabels[f.category]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FeedbackDetailPanel
        feedback={selectedFeedback}
        open={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
      />
    </div>
  );
};

export default Data;
