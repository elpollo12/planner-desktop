import { Wifi, WifiOff, RefreshCw, AlertCircle, CloudOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useConnectionStore } from '../../store/connectionStore';

/**
 * Connection status indicator for the header.
 * Shows online/offline/syncing/checking/error states.
 */
export function ConnectionStatus() {
  const { t } = useTranslation();
  const { status, syncConfigured, syncEnabled, errorMessage, lastOnlineAt } = useConnectionStore();

  // Don't show anything if status is unknown (not yet checked)
  if (status === 'unknown') {
    return null;
  }

  // Show "No sync" if sync is not configured
  if (!syncConfigured && status !== 'checking') {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
        title={t('connection.noSyncTitle')}
      >
        <CloudOff size={16} />
        <span className="text-xs font-medium hidden sm:inline">{t('connection.noSync')}</span>
      </div>
    );
  }

  // Show "Sync off" if configured but not enabled
  if (syncConfigured && !syncEnabled && status !== 'checking') {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
        title={t('connection.syncOffTitle')}
      >
        <CloudOff size={16} />
        <span className="text-xs font-medium hidden sm:inline">{t('connection.syncOff')}</span>
      </div>
    );
  }

  const statusConfig = {
    unknown: {
      icon: <Loader2 size={16} />,
      label: '',
      bgClass: 'bg-gray-100 dark:bg-gray-700',
      textClass: 'text-gray-500 dark:text-gray-400',
      title: t('connection.unknown'),
    },
    online: {
      icon: <Wifi size={16} />,
      label: t('connection.onlineLabel'),
      bgClass: 'bg-green-100 dark:bg-green-900/30',
      textClass: 'text-green-600 dark:text-green-400',
      title: lastOnlineAt
        ? t('connection.onlineLastSync', { time: new Date(lastOnlineAt).toLocaleTimeString() })
        : t('connection.online'),
    },
    offline: {
      icon: <WifiOff size={16} />,
      label: t('connection.offlineLabel'),
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-500 dark:text-red-400',
      title: errorMessage || t('connection.offline'),
    },
    syncing: {
      icon: <RefreshCw size={16} className="animate-spin" />,
      label: t('connection.syncingLabel'),
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      textClass: 'text-blue-600 dark:text-blue-400',
      title: t('connection.syncingTitle'),
    },
    checking: {
      icon: <Loader2 size={16} className="animate-spin" />,
      label: t('connection.checkingLabel'),
      bgClass: 'bg-gray-100 dark:bg-gray-700',
      textClass: 'text-gray-500 dark:text-gray-400',
      title: t('connection.checking'),
    },
    error: {
      icon: <AlertCircle size={16} />,
      label: t('connection.errorLabel'),
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-600 dark:text-red-400',
      title: errorMessage || t('connection.error'),
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgClass} ${config.textClass} transition-colors`}
      title={config.title}
    >
      {config.icon}
      <span className="text-xs font-medium hidden sm:inline">{config.label}</span>
    </div>
  );
}
