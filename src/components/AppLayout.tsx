import { NavLink } from "@/components/NavLink";
import { AskAIDialog } from "@/components/AskAIDialog";
import { closeAnalysisDialog, useAnalysisDialogOpen } from "@/lib/analysis-dialog-store";

const navItems = [
  { title: "Insights", url: "/" },
  { title: "Analysis", url: "/analysis" },
  { title: "Data", url: "/data" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const generateOpen = useAnalysisDialogOpen();

  return (
    <div className="min-h-screen flex flex-col w-full">
      <header className="h-12 flex items-center justify-between border-b border-border px-6 shrink-0">
        <span className="text-sm font-bold text-foreground">Product Feedback</span>
        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end
              className="text-sm text-muted-foreground hover:text-foreground transition-colors pb-0.5"
              activeClassName="text-foreground underline underline-offset-4 decoration-foreground"
            >
              {item.title}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
      <AskAIDialog open={generateOpen} onClose={closeAnalysisDialog} />
    </div>
  );
}
