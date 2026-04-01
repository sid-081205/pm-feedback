import { BarChart3, Sparkles } from "lucide-react";

const Analysis = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3rem)] p-6">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="flex h-16 w-16 items-center justify-center border-2 border-foreground/20 rounded-lg mb-6">
          <BarChart3 size={28} className="text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-3">Analysis</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          AI-powered theme extraction, sentiment trends, and natural-language Q&A over your product feedback will appear here.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-md px-3 py-2">
          <Sparkles size={12} />
          <span>Powered by Workers AI</span>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
