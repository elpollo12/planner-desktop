import { useNavigate } from 'react-router-dom';
import { Forklift, AlertTriangle, FileText, X } from 'lucide-react';
import { useMarkNotificationRead, useDeleteNotification } from '../../hooks/useNotifications';
import { useLogisticsStore } from '../../store/logisticsStore';
import { useIncidentsStore } from '../../store/incidentsStore';
import type { Notification } from '../../types/notification';

// Time-ago formatter (simple, in Spanish)
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
}

const CATEGORY_CONFIG: Record<string, { icon: typeof FileText; color: string }> = {
  logistics: { icon: Forklift, color: 'text-green-500 dark:text-green-400' },
  incident: { icon: AlertTriangle, color: 'text-orange-500 dark:text-orange-400' },
  report: { icon: FileText, color: 'text-blue-500 dark:text-blue-400' },
};

interface NotificationItemProps {
  notification: Notification;
  onNavigate?: () => void;
}

export function NotificationItem({ notification, onNavigate }: NotificationItemProps) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const deleteNotification = useDeleteNotification();
  const setLogisticsRig = useLogisticsStore((s) => s.setSelectedRig);
  const setIncidentsRig = useIncidentsStore((s) => s.setSelectedRig);

  const config = CATEGORY_CONFIG[notification.category] ?? CATEGORY_CONFIG.report;
  const Icon = config.icon;

  const handleClick = () => {
    // Mark as read
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }

    // Navigate based on reference type
    switch (notification.referenceType) {
      case 'logistics_request':
        if (notification.rigId && notification.rigName) {
          setLogisticsRig(notification.rigId, notification.rigName);
        }
        navigate('/logistics');
        break;
      case 'incident':
        if (notification.rigId && notification.rigName) {
          setIncidentsRig(notification.rigId, notification.rigName);
        }
        navigate('/incidents');
        break;
      case 'report':
        if (notification.referenceId) {
          navigate(`/reports/view/${notification.referenceId}`);
        } else {
          navigate('/reports');
        }
        break;
      default:
        break;
    }

    onNavigate?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification.mutate(notification.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-b-0
        ${notification.isRead
          ? 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          : 'bg-primary-50/50 dark:bg-primary-900/10 hover:bg-primary-50 dark:hover:bg-primary-900/20'
        }
      `}
    >
      {/* Category icon */}
      <div className={`mt-0.5 flex-shrink-0 ${config.color}`}>
        <Icon size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${notification.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
            {notification.title}
          </p>
          <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
            {timeAgo(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug truncate">
          <span className="font-medium text-gray-600 dark:text-gray-300">{notification.actorName}</span>
          {' · '}
          {notification.message}
        </p>
        {notification.rigName && (
          <span className="inline-block mt-1 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5">
            {notification.rigName}
          </span>
        )}
      </div>

      {/* Unread dot + delete */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5">
        {!notification.isRead && (
          <span className="w-2 h-2 bg-primary-500 rounded-full" />
        )}
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all"
          title="Eliminar"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
