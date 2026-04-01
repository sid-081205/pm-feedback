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
    queryFn: async () => {
      const response = await fetch(`/api/analysisRuns/${runId}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to fetch analysis run status');
      }
      return payload;
    },
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
    mutationFn: async (payload: { prompt: string; filters?: Record<string, unknown>; insightCount?: number }) => {
      const response = await fetch('/api/analysisRuns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.detail || result?.error || 'Failed to start analysis run');
      }
      return result;
    },
    onSuccess: () => {
      // Will invalidate insights once run completes — see AskAIDialog
      queryClient.invalidateQueries({ queryKey: ['analysisRuns'] });
    },
  });
}
