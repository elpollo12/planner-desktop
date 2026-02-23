import { useIncidentDetail } from '../../hooks/useIncidents';
import { IncidentTypeBadge } from './IncidentTypeBadge';
import { formatDateTime } from '../../lib/dateUtils';
import { Button } from '../ui';
import { useModal } from '../../store/modalStore';
import { exportIncidentPdf } from '../../lib/incidentExport';
import { Loader2, FileDown, User, Calendar, FileText } from 'lucide-react';
import type { IncidentType } from '../../types/incident';

interface IncidentDetailProps {
  incidentId: string;
  rigId: string;
  rigName: string | null;
}

export function IncidentDetail({ incidentId, rigName }: IncidentDetailProps) {
  const { closeModal } = useModal();
  const { data, isLoading, error } = useIncidentDetail(incidentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{String(error) || 'No se pudo cargar la incidencia'}</p>
      </div>
    );
  }

  const handleExportPdf = () => {
    exportIncidentPdf({
      incident: data,
      rigName: rigName ?? 'N/A',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-start gap-3">
          <FileText size={18} className="text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tipo</p>
            <IncidentTypeBadge type={data.incidentType as IncidentType} size="md" />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <User size={18} className="text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Creado por</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {data.createdByName ?? '—'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Calendar size={18} className="text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Fecha</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatDateTime(data.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descripción</h4>
        <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {data.description}
        </div>
      </div>

      {/* Involved Personnel */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Personal Involucrado
          {data.personnel.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({data.personnel.length})
            </span>
          )}
        </h4>
        {data.personnel.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            No se registró personal involucrado.
          </p>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Nombre</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Cargo</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">CI</th>
                </tr>
              </thead>
              <tbody>
                {data.personnel.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700/50">
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100 font-medium">{p.name}</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{p.position}</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{p.ci ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={closeModal}>
          Cerrar
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<FileDown size={16} />}
          onClick={handleExportPdf}
        >
          Exportar PDF
        </Button>
      </div>
    </div>
  );
}
