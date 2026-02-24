import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { adminStatsApi } from '../lib/api';

// ============================================================================
// QUERY KEY FACTORY
// ============================================================================

export const adminStatsKeys = {
  activity: (days: number) => ['admin-stats', 'activity', days] as const,
  logistics: (days: number) => ['admin-stats', 'logistics', days] as const,
  incidents: (days: number) => ['admin-stats', 'incidents', days] as const,
};

// ============================================================================
// HOOKS
// ============================================================================

const STALE_TIME = 1000 * 60 * 2; // 2 minutes
const REFETCH_INTERVAL = 1000 * 60 * 2; // 2 minutes

export function useActivityStats(days = 30) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: adminStatsKeys.activity(days),
    queryFn: () => adminStatsApi.getActivityStats(sessionToken!, days),
    enabled: !!sessionToken,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useLogisticsStats(days = 30) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: adminStatsKeys.logistics(days),
    queryFn: () => adminStatsApi.getLogisticsStats(sessionToken!, days),
    enabled: !!sessionToken,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useIncidentsStats(days = 30) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: adminStatsKeys.incidents(days),
    queryFn: () => adminStatsApi.getIncidentsStats(sessionToken!, days),
    enabled: !!sessionToken,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}
