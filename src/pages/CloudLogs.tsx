import { useState, useCallback, useEffect } from 'react';
import { MainLayout } from '../components/layout';
import { Card } from '../components/ui';
import { CloudLogsList } from '../components/cloudLogs/CloudLogsList';
import { RigSelector } from '../components/logistics/RigSelector';
import { useAuthStore } from '../store/authStore';
import { rigsApi } from '../lib/api';
import { ClipboardList } from 'lucide-react';
import type { RigWithArea } from '../types/rig';

export default function CloudLogsPage() {
  const { sessionToken } = useAuthStore();

  const [accessibleRigs, setAccessibleRigs] = useState<RigWithArea[]>([]);
  const [rigsLoading, setRigsLoading] = useState(true);
  const [selectedRigId, setSelectedRigId] = useState<string | null>(null);
  const [selectedRigName, setSelectedRigName] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchRigs = useCallback(async () => {
    if (!sessionToken) return;
    try {
      const rigs = await rigsApi.listAccessible(sessionToken);
      setAccessibleRigs(rigs);
      // Auto-seleccionar si solo hay uno
      if (rigs.length === 1) {
        setSelectedRigId(rigs[0].id);
        setSelectedRigName(rigs[0].name);
      }
    } finally {
      setRigsLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchRigs();
  }, [fetchRigs]);

  const handleSelectRig = (rigId: string, rigName: string) => {
    setSelectedRigId(rigId);
    setSelectedRigName(rigName);
  };

  return (
    <MainLayout
      title="Registros Diarios"
      subtitle="Log de reportes diarios y mensajes por taladro"
    >
      {/* Rig Selector */}
      <div className="mb-4">
        <RigSelector
          rigs={accessibleRigs}
          selectedRigId={selectedRigId}
          selectedRigName={selectedRigName}
          loading={rigsLoading}
          onSelect={handleSelectRig}
        />
      </div>

      {/* Filtros de fecha */}
      {selectedRigId && (
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
            >
              Limpiar fechas
            </button>
          )}
        </div>
      )}

      {/* Prompt: seleccionar taladro */}
      {!rigsLoading && !selectedRigId && accessibleRigs.length > 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
              Selecciona un taladro para ver los registros diarios
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Los datos se obtienen directamente desde la nube
            </p>
          </div>
        </Card>
      )}

      {/* Contenido */}
      {selectedRigId && selectedRigName && (
        <Card>
          <CloudLogsList
            taladro={selectedRigName}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        </Card>
      )}
    </MainLayout>
  );
}
