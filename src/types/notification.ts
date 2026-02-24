// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationCategory = 'logistics' | 'incident' | 'report';

export type NotificationReferenceType = 'logistics_request' | 'incident' | 'report';

export interface Notification {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  category: NotificationCategory;
  actionType: string;
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: NotificationReferenceType;
  rigId?: string;
  rigName?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount: number;
}
