import { Cloud, CloudOff, Check, Loader2, AlertCircle } from 'lucide-react';
import type { AutoSaveStatus } from '../../hooks/useAutoSave';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSaved: Date | null;
  error?: string | null;
  className?: string;
  showTimestamp?: boolean;
}

export function AutoSaveIndicator({
  status,
  lastSaved,
  error,
  className = '',
  showTimestamp = true,
}: AutoSaveIndicatorProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 size={14} className="animate-spin" />,
          text: 'Guardando...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        };
      case 'saved':
        return {
          icon: <Check size={14} />,
          text: 'Guardado',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        };
      case 'error':
        return {
          icon: <AlertCircle size={14} />,
          text: 'Error',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
        };
      default:
        return {
          icon: <Cloud size={14} />,
          text: lastSaved ? 'Guardado' : 'Sin cambios',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        transition-all duration-300
        ${config.bgColor} ${config.color}
        ${className}
      `}
      title={error || (lastSaved ? `Último guardado: ${formatTime(lastSaved)}` : undefined)}
    >
      {config.icon}
      <span>{config.text}</span>
      {showTimestamp && lastSaved && status === 'idle' && (
        <span className="text-gray-400 ml-1">
          {formatTime(lastSaved)}
        </span>
      )}
    </div>
  );
}

// Compact version for tight spaces
export function AutoSaveIndicatorCompact({
  status,
  lastSaved,
  error,
  className = '',
}: Omit<AutoSaveIndicatorProps, 'showTimestamp'>) {
  const getIcon = () => {
    switch (status) {
      case 'saving':
        return <Loader2 size={16} className="animate-spin text-blue-600" />;
      case 'saved':
        return <Check size={16} className="text-green-600" />;
      case 'error':
        return <CloudOff size={16} className="text-red-600" />;
      default:
        return <Cloud size={16} className="text-gray-400" />;
    }
  };

  return (
    <div
      className={`inline-flex items-center ${className}`}
      title={
        error ||
        (status === 'saving' ? 'Guardando...' : lastSaved ? `Guardado: ${lastSaved.toLocaleTimeString()}` : 'Sin cambios')
      }
    >
      {getIcon()}
    </div>
  );
}
