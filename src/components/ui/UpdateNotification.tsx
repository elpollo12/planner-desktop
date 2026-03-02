import { X, Download, RefreshCw, AlertCircle, Clock, Info } from 'lucide-react';
import { useUpdateChecker } from '../../hooks/useUpdateChecker';
import { useModal } from '../../store/modalStore';
import { openUpdateModal } from '../modals/UpdateModal';

export function UpdateNotification() {
  const { openModal } = useModal();
  
  const {
    state,
    releaseInfo,
    canPostpone,
    downloadProgress,
    errorMessage,
    downloadAndInstall,
    installAndRelaunch,
    postponeUpdate,
    dismissUpdate,
    checkForUpdate,
  } = useUpdateChecker();

  // Don't render if idle or checking
  if (state.status === 'idle' || state.status === 'checking') {
    return null;
  }

  const handleShowDetails = () => {
    openUpdateModal(openModal);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary-600 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 py-2.5 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {state.status === 'available' && releaseInfo && (
            <>
              <Download size={18} className="shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">
                  Nueva versión {releaseInfo.version} disponible
                </span>
                {releaseInfo.breakingChanges && (
                  <span className="text-xs text-amber-200 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Contiene cambios importantes
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 ml-auto shrink-0">
                <button
                  onClick={handleShowDetails}
                  className="px-2 py-1 text-xs font-medium hover:bg-primary-700 rounded transition-colors flex items-center gap-1"
                  title="Ver detalles"
                >
                  <Info size={14} />
                </button>
                {canPostpone && (
                  <button
                    onClick={postponeUpdate}
                    className="px-3 py-1 text-xs font-medium bg-primary-700 hover:bg-primary-800 rounded transition-colors flex items-center gap-1"
                  >
                    <Clock size={12} />
                    Más tarde
                  </button>
                )}
                <button
                  onClick={downloadAndInstall}
                  className="px-3 py-1 text-xs font-semibold bg-white text-primary-700 rounded hover:bg-gray-100 transition-colors"
                >
                  Actualizar
                </button>
              </div>
            </>
          )}

          {state.status === 'downloading' && (
            <>
              <RefreshCw size={18} className="shrink-0 animate-spin" />
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-medium shrink-0">
                  Descargando... {downloadProgress}%
                </span>
                <div className="flex-1 h-2 bg-primary-400 rounded-full overflow-hidden min-w-[100px]">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            </>
          )}

          {state.status === 'ready' && (
            <>
              <Download size={18} className="shrink-0" />
              <span className="text-sm font-medium">
                Actualización lista para instalar
              </span>
              <button
                onClick={installAndRelaunch}
                className="ml-2 px-3 py-1 text-xs font-semibold bg-white text-primary-700 rounded hover:bg-gray-100 transition-colors shrink-0"
              >
                Reiniciar ahora
              </button>
            </>
          )}

          {state.status === 'error' && (
            <>
              <AlertCircle size={18} className="shrink-0 text-red-200" />
              <span className="text-sm font-medium truncate">
                Error: {errorMessage}
              </span>
              <button
                onClick={checkForUpdate}
                className="ml-2 px-3 py-1 text-xs font-semibold bg-white text-primary-700 rounded hover:bg-gray-100 transition-colors shrink-0"
              >
                Reintentar
              </button>
            </>
          )}
        </div>

        {state.status !== 'downloading' && (
          <button
            onClick={dismissUpdate}
            className="ml-3 p-1 hover:bg-primary-700 rounded transition-colors shrink-0"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
