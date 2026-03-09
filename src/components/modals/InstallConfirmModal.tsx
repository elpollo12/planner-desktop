import { ShieldCheck, RefreshCw, Database, CloudUpload, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';

export interface PreInstallStep {
  id: 'backup' | 'sync';
  label: string;
  status: 'pending' | 'running' | 'ok' | 'warning' | 'error';
  detail?: string;
}

interface InstallConfirmModalProps {
  version: string;
  steps: PreInstallStep[];
  preparing: boolean;
  readyToInstall: boolean;
  onInstall: () => void;
  onCancel: () => void;
}

function StepIcon({ status }: { status: PreInstallStep['status'] }) {
  switch (status) {
    case 'running':
      return <RefreshCw size={16} className="text-primary-500 animate-spin shrink-0" />;
    case 'ok':
      return <CheckCircle size={16} className="text-green-500 shrink-0" />;
    case 'warning':
      return <AlertTriangle size={16} className="text-amber-500 shrink-0" />;
    case 'error':
      return <X size={16} className="text-red-500 shrink-0" />;
    default:
      return <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0" />;
  }
}

export function InstallConfirmModal({
  version,
  steps,
  preparing,
  readyToInstall,
  onInstall,
  onCancel,
}: InstallConfirmModalProps) {
  const hasError = steps.some((s) => s.status === 'error');

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            La aplicación se cerrará para instalar la versión {version}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
            Guarda cualquier trabajo pendiente antes de continuar.
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Preparación
        </p>
        <ul className="space-y-2">
          {steps.map((step) => (
            <li key={step.id} className="flex items-start gap-2.5">
              {step.id === 'backup'
                ? <Database size={16} className="text-gray-400 shrink-0 mt-0.5" />
                : <CloudUpload size={16} className="text-gray-400 shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{step.label}</span>
                  <StepIcon status={step.status} />
                </div>
                {step.detail && (
                  <p className={`text-xs mt-0.5 truncate ${
                    step.status === 'error' ? 'text-red-500'
                    : step.status === 'warning' ? 'text-amber-500'
                    : 'text-gray-400'
                  }`}>
                    {step.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {hasError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300">
            Uno o más pasos fallaron. Puedes continuar de todas formas, pero se recomienda resolver el problema primero.
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button variant="secondary" onClick={onCancel} disabled={preparing && !readyToInstall}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={onInstall}
          disabled={!readyToInstall}
          icon={preparing && !readyToInstall
            ? <RefreshCw size={15} className="animate-spin" />
            : <ShieldCheck size={15} />
          }
        >
          {preparing && !readyToInstall ? 'Preparando...' : 'Instalar y reiniciar'}
        </Button>
      </div>
    </div>
  );
}
