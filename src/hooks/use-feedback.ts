import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FeedbackItem } from '@/data/mock-data';

interface FeedbackResponse {
  feedback: FeedbackItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

export function useFeedback(filters?: { search?: string; source?: string; category?: string }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.source) params.set('source', filters.source);
  if (filters?.category) params.set('category', filters.category);
  params.set('limit', '200');

  return useQuery<FeedbackResponse>({
    queryKey: ['feedback', filters],
    queryFn: () => fetch(`/api/feedback?${params}`).then((r) => r.json()),
    staleTime: 30_000,
  });
}

export function useAddFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FeedbackItem>) =>
      fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
}

export function useSeedFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<{ inserted: number; remaining: number; exhausted: boolean }> =>
      fetch('/api/feedback/seed', { method: 'POST' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['analysisSummary'] });
    },
  });
}
