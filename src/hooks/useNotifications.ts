import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { notificationsApi } from '../lib/api';
import type { NotificationCategory } from '../types/notification';

// ============================================================================
// QUERY KEY FACTORY
// ============================================================================

export const notificationKeys = {
  all: () => ['notifications'] as const,

  unreadCount: () => ['notifications', 'unread-count'] as const,

  list: (category?: string, isRead?: boolean, page?: number, pageSize?: number) =>
    ['notifications', 'list', { category, isRead, page, pageSize }] as const,
};

// ============================================================================
// UNREAD COUNT (polled every 30s, updates store for header badge)
// ============================================================================

export function useUnreadCount() {
  const { sessionToken, isAuthenticated } = useAuthStore();
  const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount);

  const query = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(sessionToken!),
    enabled: !!sessionToken && isAuthenticated,
    refetchInterval: 30_000, // Poll every 30 seconds
    refetchIntervalInBackground: false, // Don't poll when tab is hidden
  });

  // Sync the count to the zustand store so the header badge can read it
  useEffect(() => {
    if (query.data !== undefined) {
      setUnreadCount(query.data);
    }
  }, [query.data, setUnreadCount]);

  return query;
}

// ============================================================================
// LIST NOTIFICATIONS (paginated, filterable)
// ============================================================================

export function useNotificationsList(
  category?: NotificationCategory | '',
  isRead?: boolean,
  page: number = 1,
  pageSize: number = 20,
) {
  const { sessionToken } = useAuthStore();

  return useQuery({
    queryKey: notificationKeys.list(category || undefined, isRead, page, pageSize),
    queryFn: () =>
      notificationsApi.list(
        sessionToken!,
        category || undefined,
        isRead,
        page,
        pageSize,
      ),
    enabled: !!sessionToken,
  });
}

// ============================================================================
// MARK AS READ
// ============================================================================

export function useMarkNotificationRead() {
  const { sessionToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationsApi.markRead(sessionToken!, notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() });
    },
  });
}

// ============================================================================
// MARK ALL AS READ
// ============================================================================

export function useMarkAllNotificationsRead() {
  const { sessionToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(sessionToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() });
    },
  });
}

// ============================================================================
// DELETE NOTIFICATION
// ============================================================================

export function useDeleteNotification() {
  const { sessionToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationsApi.delete(sessionToken!, notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() });
    },
  });
}
