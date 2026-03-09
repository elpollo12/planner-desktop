import { useState, useEffect } from 'react';
import { Download, RefreshCw, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useUpdateChecker } from '../../hooks/useUpdateChecker';
import { useUpdatesStore } from '../../store';
import { useAuthStore } from '../../store';
import { useModalStore } from '../../store';
import { InstallConfirmModal } from './InstallConfirmModal';
import { Button } from '../ui/Button';

export function UpdateModalContent() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const { savePreferences } = useUpdatesStore();
  const { closeModal, updateOptions } = useModalStore();

  const {
    state,
    releaseInfo,
    canPostpone,
    downloadProgress,
    errorMessage,
    currentVersion,
    preferences,
    downloadAndInstall,
    prepareInstall,
    installAndRelaunch,
    postponeUpdate,
    checkForUpdate,
  } = useUpdateChecker();

  const [enableAutoUpdate, setEnableAutoUpdate] = useState(preferences?.autoUpdate ?? false);

  // Ocultar la X y bloquear cierre cuando estamos en 'confirming'.
  useEffect(() => {
    const isConfirming = (state as any).status === 'confirming';
    updateOptions({
      showCloseButton: !isConfirming,
      closeOnOutsideClick: !isConfirming,
      closeOnEsc: !isConfirming,
    });
  }, [(state as any).status]);

  const handleDownload = async () => {
    if (enableAutoUpdate !== preferences?.autoUpdate && sessionToken) {
      try { await savePreferences(sessionToken, { autoUpdate: enableAutoUpdate }); } catch {}
    }
    await downloadAndInstall();
  };

  const handlePostpone = async () => {
    await postponeUpdate();
    closeModal();
  };

  // ── idle / checking ──────────────────────────────────────────────────────
  if (state.status === 'idle' || state.status === 'checking') {
    return (
      <div className="py-8 text-center">
        <RefreshCw size={32} className="mx-auto mb-3 text-primary-600 animate-spin" />
        <p className="text-gray-600 dark:text-gray-400">Verificando actualizaciones...</p>
      </div>
    );
  }

  // ── available ────────────────────────────────────────────────────────────
  if (state.status === 'available' && releaseInfo) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            Versión actual: <span className="font-medium">{currentVersion}</span>
          </span>
          <span className="text-primary-600 font-medium">→ {releaseInfo.version}</span>
        </div>

        {releaseInfo.breakingChanges && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Esta versión contiene cambios importantes. Se recomienda actualizar lo antes posible.
            </p>
          </div>
        )}

        {releaseInfo.notes && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notas de la versión:</h4>
            <div className="max-h-40 overflow-y-auto p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {releaseInfo.notes}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input type="checkbox" checked={enableAutoUpdate}
            onChange={(e) => setEnableAutoUpdate(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
          Actualizar automáticamente en el futuro
        </label>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {canPostpone && (
            <Button variant="secondary" onClick={handlePostpone}>
              <Clock size={16} /> Recordar más tarde
            </Button>
          )}
          <Button variant="primary" onClick={handleDownload} icon={<Download size={16} />}>
            Descargar actualización
          </Button>
        </div>
      </div>
    );
  }

  // ── downloading ──────────────────────────────────────────────────────────
  if (state.status === 'downloading') {
    return (
      <div className="py-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Descargando</span>
          <span className="font-medium text-gray-900 dark:text-white">{downloadProgress}%</span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary-600 rounded-full transition-all duration-300"
            style={{ width: `${downloadProgress}%` }} />
        </div>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-center">
          Por favor espere...
        </p>
      </div>
    );
  }

  // ── ready → preparar instalación ─────────────────────────────────────────
  if (state.status === 'ready') {
    return (
      <div className="py-4 text-center space-y-4">
        <CheckCircle size={48} className="mx-auto text-green-600" />
        <p className="text-gray-600 dark:text-gray-400">
          Actualización descargada correctamente.
        </p>
        <Button variant="primary" onClick={() => prepareInstall()}
          icon={<RefreshCw size={16} />}>
          Preparar instalación
        </Button>
      </div>
    );
  }

  // ── confirming (backup/sync + modal de confirmación) ─────────────────────
  if ((state as any).status === 'confirming') {
    const confirmState = state as any;
    return (
      <InstallConfirmModal
        version={confirmState.release?.version ?? ''}
        steps={confirmState.steps}
        preparing={confirmState.preparing}
        readyToInstall={confirmState.readyToInstall}
        onInstall={installAndRelaunch}
        onCancel={() => {
          useUpdatesStore.getState().dismissUpdate();
          closeModal();
        }}
      />
    );
  }

  // ── error ─────────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <div className="py-4">
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
          <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">No se pudo completar la actualización</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{errorMessage}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={closeModal}>Cerrar</Button>
          <Button variant="primary" onClick={checkForUpdate} icon={<RefreshCw size={16} />}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export function openUpdateModal(openModal: (content: React.ReactNode, options?: any) => void) {
  openModal(<UpdateModalContent />, {
    title: 'Actualización disponible',
    size: 'md',
    showCloseButton: true,
    closeOnOutsideClick: false,
    closeOnEsc: false,
  });
}
