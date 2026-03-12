import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCheck, Loader2, Settings } from 'lucide-react';
import {
  useNotificationsList,
  useMarkAllNotificationsRead,
} from '../../hooks/useNotifications';
import { useNotificationsStore } from '../../store/notificationsStore';
import { useAuthStore } from '../../store/authStore';
import { notificationsApi } from '../../lib/api';
import { NotificationItem } from './NotificationItem';
import type { NotificationCategory } from '../../types/notification';

const CATEGORY_KEYS: Array<{ key: NotificationCategory | ''; labelKey: string }> = [
  { key: '', labelKey: 'notifications.categories.all' },
  { key: 'logistics', labelKey: 'notifications.categories.logistics' },
  { key: 'incident', labelKey: 'notifications.categories.incidents' },
  { key: 'report', labelKey: 'notifications.categories.reports' },
];

const RETENTION_OPTION_KEYS = [
  { value: 5, labelKey: 'notifications.retention.days', count: 5 },
  { value: 15, labelKey: 'notifications.retention.days', count: 15 },
  { value: 30, labelKey: 'notifications.retention.days', count: 30 },
  { value: 120, labelKey: 'notifications.retention.days', count: 120 },
  { value: 0, labelKey: 'notifications.retention.indefinite', count: 0 },
];

export function NotificationPanel() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | ''>('');
  const [page, setPage] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [savingRetention, setSavingRetention] = useState(false);
  const closePanel = useNotificationsStore((s) => s.closePanel);
  const user = useAuthStore((s) => s.user);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const isAdmin = user?.role === 'admin';

  const { data, isLoading } = useNotificationsList(activeCategory, undefined, page, 15);
  const markAllRead = useMarkAllNotificationsRead();

  // Load retention days when settings opened
  useEffect(() => {
    if (showSettings && sessionToken && retentionDays === null) {
      notificationsApi.getRetentionDays(sessionToken).then(setRetentionDays).catch(() => {});
    }
  }, [showSettings, sessionToken]);

  const handleRetentionChange = async (value: number) => {
    if (!sessionToken) return;
    setSavingRetention(true);
    try {
      await notificationsApi.setRetentionDays(sessionToken, value);
      setRetentionDays(value);
    } catch {
      // ignore
    } finally {
      setSavingRetention(false);
    }
  };

  const notifications = data?.data ?? [];
  const totalPages = data?.totalPages ?? 0;
  const unreadCount = data?.unreadCount ?? 0;

  const handleCategoryChange = (cat: NotificationCategory | '') => {
    setActiveCategory(cat);
    setPage(1);
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-96 max-h-130 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('notifications.title')}
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              {t('notifications.unread', { count: unreadCount })}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-xs text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium flex items-center gap-1 transition-colors"
            >
              <CheckCheck size={14} />
              {t('notifications.markAll')}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowSettings((s) => !s)}
              className={`p-1 rounded transition-colors ${showSettings ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              title={t('notifications.retentionSettings')}
            >
              <Settings size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Retention settings (admin only) */}
      {showSettings && isAdmin && (
        <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {t('notifications.deleteReadAfter')}
            </span>
            <select
              value={retentionDays ?? 5}
              onChange={(e) => handleRetentionChange(Number(e.target.value))}
              disabled={savingRetention || retentionDays === null}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            >
              {RETENTION_OPTION_KEYS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value === 0 ? t(opt.labelKey) : t(opt.labelKey, { count: opt.count })}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-2">
        {CATEGORY_KEYS.map((cat) => (
          <button
            key={cat.key}
            onClick={() => handleCategoryChange(cat.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
              activeCategory === cat.key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t(cat.labelKey)}
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
            <p className="text-sm">{t('notifications.empty')}</p>
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
            ← {t('notifications.previous')}
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-40"
          >
            {t('notifications.next')} →
          </button>
        </div>
      )}
    </div>
  );
}
