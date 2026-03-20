import { invoke } from '@tauri-apps/api/core';
import type { PaginatedNotifications } from '../../types/notification';

// ============================================================================
// Notifications Commands
// ============================================================================

export const notificationsApi = {
  list: (
    sessionToken: string,
    category?: string,
    isRead?: boolean,
    page?: number,
    pageSize?: number,
  ) =>
    invoke<PaginatedNotifications>('list_notifications', {
      sessionToken,
      category: category || null,
      isRead: isRead ?? null,
      page,
      pageSize,
    }),

  getUnreadCount: (sessionToken: string) =>
    invoke<number>('get_unread_count', { sessionToken }),

  markRead: (sessionToken: string, notificationId: string) =>
    invoke<void>('mark_notification_read', { sessionToken, notificationId }),

  markAllRead: (sessionToken: string) =>
    invoke<void>('mark_all_notifications_read', { sessionToken }),

  delete: (sessionToken: string, notificationId: string) =>
    invoke<void>('delete_notification', { sessionToken, notificationId }),

  getRetentionDays: (sessionToken: string) =>
    invoke<number>('get_notification_retention_days', { sessionToken }),

  setRetentionDays: (sessionToken: string, days: number) =>
    invoke<void>('set_notification_retention_days', { sessionToken, days }),
};
