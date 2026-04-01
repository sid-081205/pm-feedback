import { useQuery } from '@tanstack/react-query';
import type { Insight } from '@/data/mock-data';

interface InsightsResponse {
  insights: Insight[];
  hasMore: boolean;
  nextCursor: string | null;
}

export function useInsights(filters?: {
  search?: string;
  source?: string;
  category?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.search)   params.set('search', filters.search);
  if (filters?.source && filters.source !== 'all')   params.set('source', filters.source);
  if (filters?.category && filters.category !== 'all') params.set('category', filters.category);
  params.set('limit', '100');

  return useQuery<InsightsResponse>({
    queryKey: ['insights', filters],
    queryFn: () => fetch(`/api/insights?${params}`).then((r) => r.json()),
    staleTime: 30_000,
  });
}

export function useInsightDetail(id: string | null) {
  return useQuery({
    queryKey: ['insight', id],
    queryFn: () => fetch(`/api/insights/${id}`).then((r) => r.json()),
    enabled: !!id,
    staleTime: 30_000,
  });
}
