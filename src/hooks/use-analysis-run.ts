import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface AnalysisRunStatus {
  runId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  prompt: string | null;
  insightCount: number;
  insightsProduced: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

const TERMINAL = new Set(['succeeded', 'failed']);

export function useAnalysisRun(runId: string | null) {
  return useQuery<AnalysisRunStatus>({
    queryKey: ['analysisRun', runId],
    queryFn: () => fetch(`/api/analysisRuns/${runId}`).then((r) => r.json()),
    enabled: !!runId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL.has(status) ? false : 2000;
    },
  });
}

export function useStartAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { prompt: string; filters?: Record<string, unknown>; insightCount?: number }) =>
      fetch('/api/analysisRuns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: () => {
      // Will invalidate insights once run completes — see AskAIDialog
      queryClient.invalidateQueries({ queryKey: ['analysisRuns'] });
    },
  });
}
