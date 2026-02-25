import { useQuery } from '@tanstack/react-query';
import { cloudLogsApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export const cloudLogKeys = {
  list: (taladro: string, dateFrom: string, dateTo: string, page: number, pageSize: number) =>
    ['cloud-logs', 'list', taladro, dateFrom, dateTo, page, pageSize] as const,
  message: (messageId: number) =>
    ['cloud-logs', 'message', messageId] as const,
};

export function useCloudLogsList(
  taladro: string,
  dateFrom: string,
  dateTo: string,
  page: number,
  pageSize: number,
) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: cloudLogKeys.list(taladro, dateFrom, dateTo, page, pageSize),
    queryFn: () =>
      cloudLogsApi.list(
        sessionToken!,
        taladro,
        dateFrom || undefined,
        dateTo || undefined,
        page,
        pageSize,
      ),
    enabled: !!sessionToken && !!taladro,
  });
}

export function useMessageDetail(messageId: number | null) {
  const { sessionToken } = useAuthStore();
  return useQuery({
    queryKey: cloudLogKeys.message(messageId ?? 0),
    queryFn: () => cloudLogsApi.getMessage(sessionToken!, messageId!),
    enabled: !!sessionToken && messageId !== null,
  });
}
