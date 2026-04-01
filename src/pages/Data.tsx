import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SourceIcon } from "@/components/SourceIcon";
import { SentimentBadge } from "@/components/SentimentBadge";
import { FeedbackDetailPanel } from "@/components/FeedbackDetailPanel";
import { initialFeedback, sourceLabels, categoryLabels, type FeedbackItem, type Source, type Category, type Sentiment } from "@/data/mock-data";
import { categoryColors } from "@/data/category-styles";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const Data = () => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>(initialFeedback);
  const [search, setSearch] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [newSource, setNewSource] = useState<Source>("support");
  const [newText, setNewText] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("feature_request");
  const [newSentiment, setNewSentiment] = useState<Sentiment>("neutral");

  const filteredFeedback = feedback.filter(
    (f) =>
      !search ||
      f.text.toLowerCase().includes(search.toLowerCase()) ||
      f.author.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddFeedback = () => {
    if (!newText.trim() || !newAuthor.trim()) return;
    const item: FeedbackItem = {
      id: `f${Date.now()}`,
      text: newText,
      author: newAuthor,
      source: newSource,
      date: new Date().toISOString().split("T")[0],
      sentiment: newSentiment,
      category: newCategory,
    };
    setFeedback([item, ...feedback]);
    setNewText("");
    setNewAuthor("");
    setNewSource("support");
    setNewCategory("feature_request");
    setNewSentiment("neutral");
    setDialogOpen(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Raw Feedback</h1>
          <p className="text-sm text-muted-foreground">{feedback.length} entries from all sources</p>
        </div>
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
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Sentiment</label>
                <Select value={newSentiment} onValueChange={(v) => setNewSentiment(v as Sentiment)}>
                  <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddFeedback} className="w-full">Add Feedback</Button>
            </div>
          </DialogContent>
        </Dialog>
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
              <TableHead className="text-xs font-semibold text-muted-foreground">Sentiment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFeedback.map((f) => (
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
                <TableCell><SentimentBadge sentiment={f.sentiment} /></TableCell>
              </TableRow>
            ))}
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
