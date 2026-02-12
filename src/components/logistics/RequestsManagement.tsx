import { useState, useEffect } from 'react';
import { Card } from '../ui';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { logisticsRequestsApi } from '../../lib/api';
import { toast } from 'react-toastify';
import { formatDateDMY, formatTimeHM } from '../../lib/dateUtils';
import { PaginationControls } from './PaginationControls';
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS } from '../../types/logistics';
import type { LogisticsRequest, RequestType, RequestStatus } from '../../types/logistics';

interface RequestsManagementProps {
  onUpdate: () => void;
}

export function RequestsManagement({ onUpdate }: RequestsManagementProps) {
  const { sessionToken, user } = useAuthStore();

  const [requests, setRequests] = useState<LogisticsRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const canManage = user?.role === 'supervisor' || user?.role === 'admin';

  useEffect(() => {
    if (sessionToken) loadRequests();
  }, [sessionToken, currentPage, pageSize, filterType, filterStatus]);

  const loadRequests = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const res = await logisticsRequestsApi.list(sessionToken, filterType || undefined, filterStatus || undefined, currentPage, pageSize);
      setRequests(res.data);
      setTotalItems(res.total);
      setTotalPages(res.totalPages);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      toast.error('Error al cargar solicitudes');
    } finally { setLoading(false); }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: RequestStatus) => {
    if (!sessionToken) return;
    try {
      await logisticsRequestsApi.updateStatus(sessionToken, requestId, { status: newStatus });
      toast.success(`Solicitud ${REQUEST_STATUS_LABELS[newStatus].toLowerCase()}`);
      loadRequests();
      onUpdate();
    } catch (error: any) { toast.error(error?.toString() || 'Error al actualizar'); }
  };

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePageSizeChange = (size: number) => { setPageSize(size); setCurrentPage(1); };

  const getStatusBadge = (status: RequestStatus) => {
    const config: Record<RequestStatus, { icon: typeof Clock; color: string }> = {
      requested: { icon: AlertCircle, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
      pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' },
      approved: { icon: CheckCircle, color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
      rejected: { icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
    };
    const { icon: Icon, color } = config[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon size={14} />{REQUEST_STATUS_LABELS[status]}
      </span>
    );
  };

  const canTransition = (status: RequestStatus): RequestStatus[] => {
    if (status === 'requested') return ['pending', 'approved', 'rejected'];
    if (status === 'pending') return ['approved', 'rejected'];
    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Solicitudes</h2>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo:</label>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <option value="">Todos</option>
            {Object.entries(REQUEST_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado:</label>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <option value="">Todos</option>
            {Object.entries(REQUEST_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Cargando solicitudes...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400"><p>No hay solicitudes</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detalle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notas</th>
                    {canManage && <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {requests.map((r) => {
                    const transitions = canTransition(r.status);
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {REQUEST_TYPE_LABELS[r.requestType]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {r.requestType === 'vacuum' ? r.actionRequested : `${r.quantity ?? '-'}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(r.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{formatDateDMY(r.requestedAt?.split('T')[0])}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{formatTimeHM(r.requestedAt)}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{r.notes || '-'}</td>
                        {canManage && (
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1">
                              {transitions.includes('approved') && (
                                <button onClick={() => handleUpdateStatus(r.id, 'approved')}
                                  className="p-1 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300" title="Aprobar">
                                  <CheckCircle size={18} />
                                </button>
                              )}
                              {transitions.includes('pending') && (
                                <button onClick={() => handleUpdateStatus(r.id, 'pending')}
                                  className="p-1 text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300" title="En espera">
                                  <Clock size={18} />
                                </button>
                              )}
                              {transitions.includes('rejected') && (
                                <button onClick={() => handleUpdateStatus(r.id, 'rejected')}
                                  className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Rechazar">
                                  <XCircle size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize}
              itemLabel="solicitudes" onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
          </>
        )}
      </Card>
    </div>
  );
}
