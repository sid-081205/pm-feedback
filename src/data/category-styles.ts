import type { Category } from "@/data/mock-data";

export const categoryColors: Record<Category, string> = {
  feature_request: "border border-blue-500/30 bg-blue-500/10 text-blue-300",
  bug: "border border-red-500/30 bg-red-500/10 text-red-300",
  praise: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  complaint: "border border-amber-500/30 bg-amber-500/10 text-amber-300",
  question: "border border-violet-500/30 bg-violet-500/10 text-violet-300",
};
