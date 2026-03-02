import { useState } from 'react';
import { Download, RefreshCw, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useUpdateChecker } from '../../hooks/useUpdateChecker';
import { useUpdatesStore } from '../../store';
import { useAuthStore } from '../../store';
import { useModalStore } from '../../store';
import { Button } from '../ui/Button';

/**
 * Content component for the update modal.
 * Use with useModal().openModal(<UpdateModalContent />, { title: '...', size: 'md' })
 */
export function UpdateModalContent() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const { savePreferences } = useUpdatesStore();
  const { closeModal } = useModalStore();
  
  const {
    state,
    releaseInfo,
    canPostpone,
    downloadProgress,
    errorMessage,
    currentVersion,
    preferences,
    downloadAndInstall,
    installAndRelaunch,
    postponeUpdate,
    checkForUpdate,
  } = useUpdateChecker();

  const [enableAutoUpdate, setEnableAutoUpdate] = useState(
    preferences?.autoUpdate ?? false
  );

  const handleDownload = async () => {
    // Save auto-update preference if changed
    if (enableAutoUpdate !== preferences?.autoUpdate && sessionToken) {
      try {
        await savePreferences(sessionToken, { autoUpdate: enableAutoUpdate });
      } catch {
        // Ignore preference save errors
      }
    }
    await downloadAndInstall();
  };

  const handlePostpone = async () => {
    await postponeUpdate();
    closeModal();
  };

  // Render based on state
  if (state.status === 'idle' || state.status === 'checking') {
    return (
      <div className="py-8 text-center">
        <RefreshCw size={32} className="mx-auto mb-3 text-primary-600 animate-spin" />
        <p className="text-gray-600 dark:text-gray-400">
          Verificando actualizaciones...
        </p>
      </div>
    );
  }

  if (state.status === 'available' && releaseInfo) {
    return (
      <div className="space-y-4">
        {/* Version info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            Versión actual: <span className="font-medium">{currentVersion}</span>
          </span>
          <span className="text-primary-600 font-medium">
            → {releaseInfo.version}
          </span>
        </div>

        {/* Breaking changes warning */}
        {releaseInfo.breakingChanges && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Esta versión contiene cambios importantes. Se recomienda actualizar lo antes posible.
            </p>
          </div>
        )}

        {/* Release notes */}
        {releaseInfo.notes && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notas de la versión:
            </h4>
            <div className="max-h-40 overflow-y-auto p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {releaseInfo.notes}
            </div>
          </div>
        )}

        {/* Auto-update checkbox */}
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={enableAutoUpdate}
            onChange={(e) => setEnableAutoUpdate(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Actualizar automáticamente en el futuro
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {canPostpone && (
            <Button variant="secondary" onClick={handlePostpone}>
              <Clock size={16} className="mr-1.5" />
              Recordar más tarde
            </Button>
          )}
          <Button variant="primary" onClick={handleDownload}>
            <Download size={16} className="mr-1.5" />
            Actualizar ahora
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === 'downloading') {
    return (
      <div className="py-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Progreso</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {downloadProgress}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full transition-all duration-300"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 text-center">
          Por favor espere mientras se descarga la actualización...
        </p>
      </div>
    );
  }

  if (state.status === 'ready') {
    return (
      <div className="py-4 text-center">
        <CheckCircle size={48} className="mx-auto mb-3 text-green-600" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          La actualización se ha descargado correctamente.
          <br />
          Reinicie la aplicación para aplicar los cambios.
        </p>
        <Button variant="primary" onClick={installAndRelaunch}>
          <RefreshCw size={16} className="mr-1.5" />
          Reiniciar ahora
        </Button>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="py-4">
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
          <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">
              No se pudo descargar la actualización
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {errorMessage}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={closeModal}>
            Cerrar
          </Button>
          <Button variant="primary" onClick={checkForUpdate}>
            <RefreshCw size={16} className="mr-1.5" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Helper function to open the update modal using the global modal system.
 */
export function openUpdateModal(openModal: (content: React.ReactNode, options?: any) => void) {
  openModal(<UpdateModalContent />, {
    title: 'Actualización disponible',
    size: 'md',
    showCloseButton: true,
    closeOnOutsideClick: false,
    closeOnEsc: false,
  });
}
