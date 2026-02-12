import { X, Download, RefreshCw } from 'lucide-react';
import { useUpdateChecker } from '../../hooks/useUpdateChecker';

export function UpdateNotification() {
  const {
    state,
    dismissed,
    setDismissed,
    downloadAndInstall,
    installAndRelaunch,
    checkForUpdate,
  } = useUpdateChecker();

  // Don't render if idle, checking, or dismissed
  if (state.status === 'idle' || state.status === 'checking' || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary-600 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 py-2.5 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {state.status === 'available' && (
            <>
              <Download size={18} className="shrink-0" />
              <span className="text-sm font-medium truncate">
                Nueva versión {state.version} disponible
              </span>
              <button
                onClick={downloadAndInstall}
                className="ml-2 px-3 py-1 text-xs font-semibold bg-white text-primary-700 rounded hover:bg-gray-100 transition-colors shrink-0"
              >
                Actualizar
              </button>
            </>
          )}

          {state.status === 'downloading' && (
            <>
              <RefreshCw size={18} className="shrink-0 animate-spin" />
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-medium shrink-0">
                  Descargando... {state.progress}%
                </span>
                <div className="flex-1 h-2 bg-primary-400 rounded-full overflow-hidden min-w-[100px]">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${state.progress}%` }}
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
              <span className="text-sm font-medium truncate">
                Error: {state.message}
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
            onClick={() => setDismissed(true)}
            className="ml-3 p-1 hover:bg-primary-700 rounded transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
