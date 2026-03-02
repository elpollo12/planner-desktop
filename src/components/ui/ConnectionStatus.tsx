import { Wifi, WifiOff, RefreshCw, AlertCircle, CloudOff, Loader2 } from 'lucide-react';
import { useConnectionStore } from '../../store/connectionStore';

/**
 * Connection status indicator for the header.
 * Shows online/offline/syncing/checking/error states.
 */
export function ConnectionStatus() {
  const { status, syncConfigured, syncEnabled, errorMessage, lastOnlineAt } = useConnectionStore();

  // Don't show anything if status is unknown (not yet checked)
  if (status === 'unknown') {
    return null;
  }

  // Show "Sin sync" if sync is not configured
  if (!syncConfigured && status !== 'checking') {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
        title="Sincronización no configurada (SYNC_SERVER_URL)"
      >
        <CloudOff size={16} />
        <span className="text-xs font-medium hidden sm:inline">Sin sync</span>
      </div>
    );
  }

  // Show "Deshabilitado" if configured but not enabled
  if (syncConfigured && !syncEnabled && status !== 'checking') {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
        title="Sincronización deshabilitada. Un administrador debe habilitarla."
      >
        <CloudOff size={16} />
        <span className="text-xs font-medium hidden sm:inline">Sync off</span>
      </div>
    );
  }

  const statusConfig = {
    unknown: {
      icon: <Loader2 size={16} />,
      label: '',
      bgClass: 'bg-gray-100 dark:bg-gray-700',
      textClass: 'text-gray-500 dark:text-gray-400',
      title: 'Estado desconocido',
    },
    online: {
      icon: <Wifi size={16} />,
      label: 'En línea',
      bgClass: 'bg-green-100 dark:bg-green-900/30',
      textClass: 'text-green-600 dark:text-green-400',
      title: lastOnlineAt 
        ? `Conectado · Última sync: ${new Date(lastOnlineAt).toLocaleTimeString()}`
        : 'Conectado al servidor',
    },
    offline: {
      icon: <WifiOff size={16} />,
      label: 'Sin conexión',
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-500 dark:text-red-400',
      title: errorMessage || 'Sin conexión al servidor',
    },
    syncing: {
      icon: <RefreshCw size={16} className="animate-spin" />,
      label: 'Sincronizando',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      textClass: 'text-blue-600 dark:text-blue-400',
      title: 'Sincronizando datos...',
    },
    checking: {
      icon: <Loader2 size={16} className="animate-spin" />,
      label: 'Verificando',
      bgClass: 'bg-gray-100 dark:bg-gray-700',
      textClass: 'text-gray-500 dark:text-gray-400',
      title: 'Verificando conexión...',
    },
    error: {
      icon: <AlertCircle size={16} />,
      label: 'Error',
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-600 dark:text-red-400',
      title: errorMessage || 'Error de conexión',
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
