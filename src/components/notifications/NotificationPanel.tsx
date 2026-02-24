import { useState } from 'react';
import { CheckCheck, Loader2 } from 'lucide-react';
import {
  useNotificationsList,
  useMarkAllNotificationsRead,
} from '../../hooks/useNotifications';
import { useNotificationsStore } from '../../store/notificationsStore';
import { NotificationItem } from './NotificationItem';
import type { NotificationCategory } from '../../types/notification';

const CATEGORIES: { key: NotificationCategory | ''; label: string }[] = [
  { key: '', label: 'Todas' },
  { key: 'logistics', label: 'Logística' },
  { key: 'incident', label: 'Incidencias' },
  { key: 'report', label: 'Reportes' },
];

export function NotificationPanel() {
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | ''>('');
  const [page, setPage] = useState(1);
  const closePanel = useNotificationsStore((s) => s.closePanel);

  const { data, isLoading } = useNotificationsList(activeCategory, undefined, page, 15);
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];
  const totalPages = data?.totalPages ?? 0;
  const unreadCount = data?.unreadCount ?? 0;

  const handleCategoryChange = (cat: NotificationCategory | '') => {
    setActiveCategory(cat);
    setPage(1);
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-96 max-h-[520px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Notificaciones
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              {unreadCount} sin leer
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-xs text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium flex items-center gap-1 transition-colors"
          >
            <CheckCheck size={14} />
            Marcar todas
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => handleCategoryChange(cat.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
              activeCategory === cat.key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <p className="text-sm">No hay notificaciones</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onNavigate={closePanel} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
