import { useQuery } from '@tanstack/react-query';

export interface TrendPoint {
  day: string;
  total: number;
  feature_request: number;
  bug: number;
  praise: number;
  complaint: number;
  question: number;
  by_source: Record<string, number>;
}

export interface SegmentData {
  segment_key: string;
  top_insights: Array<{ id: string; title: string; count: number }>;
  by_category: Record<string, number>;
}

export interface EventCorrelation {
  event: {
    id: string;
    type: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string | null;
  };
  feedback_in_window: number;
  window_breakdown: { feature_request: number; bug: number; complaint: number; praise: number };
  related_insights: Array<{ id: string; title: string; count: number }>;
  notes: string | null;
}

export interface AnalysisSummary {
  runId: string | null;
  trends: TrendPoint[];
  segments: SegmentData[];
  correlations: EventCorrelation[];
}

export function useAnalysisSummary(runId?: string) {
  const params = new URLSearchParams();
  if (runId) params.set('runId', runId);

  return useQuery<AnalysisSummary>({
    queryKey: ['analysisSummary', runId],
    queryFn: () => fetch(`/api/analysisSummary?${params}`).then((r) => r.json()),
    staleTime: 30_000,
  });
}
