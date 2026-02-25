import { useState } from 'react';
import { Loader2, AlertTriangle, MessageSquare } from 'lucide-react';
import { PaginationControls } from '../ui/PaginationControls';
import { useCloudLogsList, useMessageDetail } from '../../hooks/useCloudLogs';
import { useModal } from '../../store/modalStore';
import { formatDateTime } from '../../lib/dateUtils';
import type { DailyReport } from '../../lib/api';

interface CloudLogsListProps {
  taladro: string;
  dateFrom: string;
  dateTo: string;
}

function fmt(val: number | null, decimals = 2): string {
  if (val === null || val === undefined) return '—';
  return val.toFixed(decimals);
}

// ============================================================================
// Contenido del modal de mensaje (se inyecta via openModal)
// ============================================================================

export function MessageDetailContent({ messageId }: { messageId: number }) {
  const { data: msg, isLoading } = useMessageDetail(messageId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!msg) return null;

  return (
    <div className="space-y-3">
      <Row label="De" value={msg.fromNumber} />
      <Row label="Grupo" value={msg.groupName} />
      <Row label="Tipo" value={msg.messageType} />
      <Row label="Recibido" value={msg.createdAt ? formatDateTime(msg.createdAt) : null} />

      {msg.message && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            Mensaje
          </p>
          <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 rounded-md p-3 font-mono leading-relaxed">
            {msg.message}
          </pre>
        </div>
      )}

      {msg.rawData && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            Datos crudos
          </p>
          <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 rounded-md p-3 font-mono overflow-auto max-h-40">
            {msg.rawData}
          </pre>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16 shrink-0 pt-0.5 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm text-gray-800 dark:text-gray-200">{value}</span>
    </div>
  );
}

// ============================================================================
// Tabla principal
// ============================================================================

export function CloudLogsList({ taladro, dateFrom, dateTo }: CloudLogsListProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { openModal } = useModal();

  const { data, isLoading } = useCloudLogsList(taladro, dateFrom, dateTo, page, pageSize);

  const reports: DailyReport[] = data?.reports ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (p: number) => {
    setPage(p);
  };

  return (
    <>
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            No hay registros para este taladro
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Prueba ajustando el rango de fechas
          </p>
        </div>
      )}

      {/* Tabla */}
      {!isLoading && reports.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {total} registro{total !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Fecha</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">ROP</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">WOB</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">RPM</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">Prof. (m)</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">NPT (hrs)</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">Actividad</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">Observaciones</th>
                  <th className="text-center py-3 px-3 font-medium text-gray-500 dark:text-gray-400">Msg</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {r.fecha ?? '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                      {fmt(r.rop)}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                      {fmt(r.wob)}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                      {fmt(r.rpm, 0)}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                      {fmt(r.profundidad, 1)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {r.nptHoras !== null && r.nptHoras !== undefined && r.nptHoras > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {fmt(r.nptHoras, 1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 max-w-[160px]">
                      <p className="text-gray-700 dark:text-gray-300 truncate" title={r.actividad ?? ''}>
                        {r.actividad ?? '—'}
                      </p>
                    </td>
                    <td className="py-3 px-3 max-w-[200px]">
                      <p className="text-gray-600 dark:text-gray-400 truncate text-xs" title={r.observaciones ?? ''}>
                        {r.observaciones ?? '—'}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {r.messageId !== null ? (
                        <button
                          onClick={() => openModal(
                            <MessageDetailContent messageId={r.messageId!} />,
                            { title: 'Mensaje de origen', size: 'md', showCloseButton: true }
                          )}
                          className="p-1.5 rounded-md text-gray-400 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Ver mensaje de origen"
                        >
                          <MessageSquare size={15} />
                        </button>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              itemLabel="registros"
              onPageChange={handlePageChange}
              onPageSizeChange={() => {}}
            />
          </div>
        </>
      )}

    </>
  );
}
