import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout';
import { Button, Card, Input, Select } from '../components/ui';
import { Plus, Search, Eye, Edit, Trash2, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../store/modalStore';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteReport';
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

  const [filters, setFilters] = useState({
    status: '' as ReportStatus | '',
    wellNumber: '',
    rigNumber: '',
    dateFrom: '',
    dateTo: '',
  });
  
  // Load reports and rigs
  useEffect(() => {
    if (sessionToken) {
      loadReports();
      loadRigs();
    } else {
      setLoading(false);
    }
  }, [sessionToken, currentPage, pageSize]);

  // Listen for sync events and reload reports when new data arrives
  useEffect(() => {
    const unsubscribe = syncEvents.subscribe(() => {
      console.log('[ReportList] Sync event received, reloading reports...');
      loadReports();
      loadRigs();
    });

    return unsubscribe;
  }, []);

  const loadReports = async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const apiFilters = {
        status: filters.status || undefined,
        wellNumber: filters.wellNumber || undefined,
        rigNumber: filters.rigNumber || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      };

      const response: PaginatedReportsResponse = await reportsApi.list(
        sessionToken,
        apiFilters,
        currentPage,
        pageSize
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
      // Use permission-aware API to only show rigs the user has access to
      const data = await rigsApi.listAccessible(sessionToken, false); // only active rigs
      setRigs(data);
    } catch (error) {
      console.error('Error loading rigs:', error);
    }
  };

  const handleFilter = () => {
    setCurrentPage(1); // NUEVO: Resetear a página 1 al filtrar
    loadReports();
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      wellNumber: '',
      rigNumber: '',
      dateFrom: '',
      dateTo: '',
    });
    setCurrentPage(1); // NUEVO: Resetear a página 1
  };

  // NUEVO: Handlers de paginación
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Resetear a página 1
  };

  const handleGoToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleDelete = (report: Report) => {

    const onConfirm = async () => {
      if (!sessionToken) return;

      try {
        await reportsApi.delete(sessionToken, report.id);
        toast.success('Reporte eliminado exitosamente');

        // Push deletion to cloud in background
        backgroundPush(sessionToken);

        // Si eliminamos el último de la página, volver a la anterior
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
      {
        title: '¿Eliminar reporte?',
        size: 'sm',
        showCloseButton: true,
      }
    );
  };


  const getStatusBadge = (status: ReportStatus) => {
    const badges = {
      draft: { icon: Clock, color: 'text-gray-600 bg-gray-100', label: 'Borrador' },
      submitted: { icon: CheckCircle, color: 'text-blue-600 bg-blue-100', label: 'Enviado' },
      approved: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Aprobado' },
      rejected: { icon: XCircle, color: 'text-red-600 bg-red-100', label: 'Rechazado' },
    };

    const badge = badges[status];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon size={14} />
        {badge.label}
      </span>
    );
  };

  // NUEVO: Renderizar controles de paginación
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalReports);

    // Generar array de páginas a mostrar
    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      const maxVisible = 5;

      if (totalPages <= maxVisible) {
        // Mostrar todas las páginas
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Mostrar con elipsis
        if (currentPage <= 3) {
          // Inicio
          for (let i = 1; i <= 4; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          // Final
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
        } else {
          // Medio
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        }
      }

      return pages;
    };

    return (
      <div className="border-t border-gray-200 dark:border-gray-700 py-4">
        <div className="flex items-center justify-between">
          {/* Info de registros */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Mostrando <span className="font-medium">{startItem}</span> - <span className="font-medium">{endItem}</span> de{' '}
              <span className="font-medium">{totalReports}</span> reportes
            </span>

            {/* Selector de tamaño de página */}
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

          {/* Controles de paginación */}
          <div className="flex items-center gap-2">
            {/* Botón anterior */}
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && handleGoToPage(page)}
                  disabled={page === '...'}
                  className={`
                    px-3 py-1 rounded text-sm font-medium
                    ${page === currentPage
                      ? 'bg-blue-600 text-white'
                      : page === '...'
                        ? 'cursor-default text-gray-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {page}
                </button>
              ))}
            </div>

            {/* Botón siguiente */}
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Filtros
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Select
                label="Estado"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as ReportStatus | '' })}
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
                onChange={(e) => setFilters({ ...filters, wellNumber: e.target.value })}
                placeholder="Ej: Well-123"
              />

              <Select
                label="Taladro"
                value={filters.rigNumber}
                onChange={(e) => setFilters({ ...filters, rigNumber: e.target.value })}
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
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />

              <Input
                label="Fecha Hasta"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={handleFilter}
                icon={<Search size={16} />}
              >
                Buscar
              </Button>
              <Button
                variant="outline"
                onClick={handleClearFilters}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </Card>

        {/* Reports Table */}
        <Card>
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Cargando reportes...
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">No hay reportes para mostrar</p>
              <Button
                variant="primary"
                onClick={() => navigate('/reports/new')}
                icon={<Plus size={16} />}
              >
                Crear Primer Reporte
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        # Reporte
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Pozo
                      </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Taladro
                    </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            #{report.reportNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {formatDateDMY(report.reportDate)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimeHM(report.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {report.wellNumber || '-'}
                          </span>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {report.rigNumber || '-'}
                        </span>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => navigate(`/reports/view/${report.id}`)}
                              className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Ver detalle"
                            >
                              <Eye size={18} />
                            </button>
                            {(report.status === 'draft' || user?.role === 'supervisor' || user?.role === 'admin') && (
                              <button
                                onClick={() => navigate(`/reports/edit/${report.id}`)}
                                className="p-1 text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                                title="Editar"
                              >
                                <Edit size={18} />
                              </button>
                            )}
                            {(user?.role === 'supervisor' || user?.role === 'admin') && (
                              <button
                                onClick={() => handleDelete(report)}
                                className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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

              {/* NUEVO: Controles de paginación */}
              {renderPagination()}
            </>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
