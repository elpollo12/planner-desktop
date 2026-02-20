import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout';
import { Button, Card, Input, Select, ReportStatusBadge } from '../components/ui';
import { Plus, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../store/modalStore';
import ConfirmDeleteModal from '../components/modals/ConfirmDelete';
import { reportsApi, rigsApi } from '../lib/api';

import { toast } from '../lib/toast';
import { backgroundPush } from '../lib/syncHelper';
import { syncEvents } from '../lib/syncEvents';
import { formatDateDMY, formatTimeHM } from '../lib/dateUtils';
import type { Report, ReportStatus } from '../types/report';
import { RigWithArea } from '@/types';

interface PaginatedReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Debounce hook ────────────────────────────────────────────────────────────
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── Filter shape ─────────────────────────────────────────────────────────────
interface Filters {
  status: ReportStatus | '';
  wellNumber: string;
  rigNumber: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: Filters = {
  status: '',
  wellNumber: '',
  rigNumber: '',
  dateFrom: '',
  dateTo: '',
};

export default function ReportList() {
  const navigate = useNavigate();
  const { sessionToken, user } = useAuthStore();
  const { openModal } = useModal();

  const [reports, setReports] = useState<Report[]>([]);
  const [rigs, setRigs] = useState<RigWithArea[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalReports, setTotalReports] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // What the user types / selects (immediate UI state)
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });

  // Debounced version — drives the actual API query (400ms delay)
  const debouncedFilters = useDebouncedValue(filters, 200);

  // Reset to page 1 whenever debounced filters change
  const [filtersVersion, setFiltersVersion] = useState(0);
  useEffect(() => {
    setFiltersVersion((v) => v + 1);
    setCurrentPage(1);
  }, [
    debouncedFilters.status,
    debouncedFilters.wellNumber,
    debouncedFilters.rigNumber,
    debouncedFilters.dateFrom,
    debouncedFilters.dateTo,
  ]);

  // ── Fetch reports when query params change ─────────────────────────────
  useEffect(() => {
    if (sessionToken) {
      loadReports();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken, currentPage, pageSize, filtersVersion]);

  // ── Load rigs once ─────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionToken) loadRigs();
  }, [sessionToken]);

  // ── Sync event listener ────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = syncEvents.subscribe(() => {
      console.log('[ReportList] Sync event received, reloading...');
      loadReports();
      loadRigs();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── API calls ──────────────────────────────────────────────────────────

  const loadReports = async () => {
    if (!sessionToken) { setLoading(false); return; }

    setLoading(true);
    try {
      const apiFilters = {
        status: debouncedFilters.status || undefined,
        wellNumber: debouncedFilters.wellNumber || undefined,
        rigNumber: debouncedFilters.rigNumber || undefined,
        dateFrom: debouncedFilters.dateFrom || undefined,
        dateTo: debouncedFilters.dateTo || undefined,
      };

      const response: PaginatedReportsResponse = await reportsApi.list(
        sessionToken, apiFilters, currentPage, pageSize,
      );

      setReports(response.reports);
      setTotalReports(response.total);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  const loadRigs = async () => {
    if (!sessionToken) return;
    try {
      const data = await rigsApi.listAccessible(sessionToken, false);
      setRigs(data);
    } catch (error) {
      console.error('Error loading rigs:', error);
    }
  };

  // ── Filter actions ─────────────────────────────────────────────────────

  const handleClearFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
  };

  // ── Pagination handlers ────────────────────────────────────────────────

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleGoToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // ── Delete handler ─────────────────────────────────────────────────────

  const handleDelete = (report: Report) => {
    const onConfirm = async () => {
      if (!sessionToken) return;
      try {
        await reportsApi.delete(sessionToken, report.id);
        toast.success('Reporte eliminado exitosamente');
        backgroundPush(sessionToken);

        if (reports.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          loadReports();
        }
      } catch (error) {
        console.error('Error deleting report:', error);
        toast.error('Error al eliminar reporte');
        throw error;
      }
    };

    openModal(
      <ConfirmDeleteModal
        message="¿Estás seguro de que deseas eliminar este reporte?"
        itemName={`Reporte #${report.reportNumber} - ${formatDateDMY(report.reportDate)}`}
        onConfirm={onConfirm}
      />,
      { title: '¿Eliminar reporte?', size: 'sm', showCloseButton: true },
    );
  };

  // ── Pagination renderer ────────────────────────────────────────────────

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalReports);

    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      const maxVisible = 5;

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1, '...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...', totalPages);
      }
      return pages;
    };

    return (
      <div className="border-t border-gray-200 dark:border-gray-700 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Mostrando <span className="font-medium">{startItem}</span> - <span className="font-medium">{endItem}</span> de{' '}
              <span className="font-medium">{totalReports}</span> reportes
            </span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value={5}>5 por página</option>
              <option value={10}>10 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && handleGoToPage(page)}
                  disabled={page === '...'}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : page === '...'
                        ? 'cursor-default text-gray-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <MainLayout
      title="Reportes DDR"
      subtitle="Lista de reportes diarios de operaciones"
      headerActions={
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => navigate('/reports/new')}
            icon={<Plus size={16} />}
          >
            Nuevo Reporte
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Select
                label="Estado"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as ReportStatus | '' }))}
              >
                <option value="">Todos</option>
                <option value="draft">Borrador</option>
                <option value="submitted">Enviado</option>
                <option value="approved">Aprobado</option>
                <option value="rejected">Rechazado</option>
              </Select>

              <Input
                label="Pozo"
                value={filters.wellNumber}
                onChange={(e) => setFilters((f) => ({ ...f, wellNumber: e.target.value }))}
                placeholder="Ej: Well-123"
              />

              <Select
                label="Taladro"
                value={filters.rigNumber}
                onChange={(e) => setFilters((f) => ({ ...f, rigNumber: e.target.value }))}
              >
                <option value="">Todos</option>
                {rigs.map((rig) => (
                  <option key={rig.id} value={rig.name}>
                    {rig.name}
                  </option>
                ))}
              </Select>

              <Input
                label="Fecha Desde"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              />

              <Input
                label="Fecha Hasta"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClearFilters}>
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </Card>

        {/* Reports Table */}
        <Card>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando reportes...</div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">No hay reportes para mostrar</p>
              <Button variant="primary" onClick={() => navigate('/reports/new')} icon={<Plus size={16} />}>
                Crear Primer Reporte
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Taladro</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pozo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha Creación</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{report.rigNumber || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{report.wellNumber || '-'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Reporte #{report.reportNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <ReportStatusBadge status={report.status} />
                          {report.status === 'rejected' && report.rejectionReason && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400 max-w-[200px] truncate" title={report.rejectionReason}>
                              {report.rejectionReason}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{formatDateDMY(report.createdAt?.split('T')[0])}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{formatTimeHM(report.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => navigate(`/reports/view/${report.id}`)}
                              className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                              title="Ver detalle"
                            >
                              <Eye size={18} />
                            </button>
                            {(() => {
                              if (!user) return false;
                              if (user.role === 'admin') return true;
                              if (user.role === 'supervisor' && (report.status === 'draft' || report.status === 'rejected')) return true;
                              if (report.createdBy === user.id && (report.status === 'draft' || report.status === 'rejected' || report.status === 'submitted')) return true;
                              return false;
                            })() && (
                              <button
                                onClick={() => navigate(`/reports/edit/${report.id}`)}
                                className="p-1 text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 cursor-pointer"
                                title="Editar"
                              >
                                <Edit size={18} />
                              </button>
                            )}
                            {(() => {
                              if (!user) return false;
                              if (user.role === 'admin' || user.role === 'supervisor') return true;
                              if (report.createdBy === user.id && (report.status === 'draft' || report.status === 'submitted')) return true;
                              return false;
                            })() && (
                              <button
                                onClick={() => handleDelete(report)}
                                className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPagination()}
            </>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
