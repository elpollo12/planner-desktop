import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout';
import { Button, Card, Input, Select } from '../components/ui';
import { Plus, Search, Eye, Edit, Trash2, CheckCircle, Clock, XCircle, FileSpreadsheet } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../store/modalStore';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteReport';
import { reportsApi } from '../lib/api';
import { exportReportsToExcel } from '../lib/excelExport';
import { toast } from '../lib/toast';
import type { Report, ReportStatus } from '../types/report';

export default function ReportList() {
  const navigate = useNavigate();
  const { sessionToken, user } = useAuthStore();
  const { openModal } = useModal();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '' as ReportStatus | '',
    wellNumber: '',
    dateFrom: '',
    dateTo: '',
  });
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    reportId: string | null;
    reportName: string | null;
  }>({
    isOpen: false,
    reportId: null,
    reportName: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Load reports
  useEffect(() => {
    if (sessionToken) {
      loadReports();
    } else {
      setLoading(false);
    }
  }, [sessionToken]);

  const loadReports = async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Convert empty strings to undefined for API compatibility
      const apiFilters = {
        status: filters.status || undefined,
        wellNumber: filters.wellNumber || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      };
      const data = await reportsApi.list(sessionToken, apiFilters);
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadReports();
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      wellNumber: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const handleDelete = (report: Report) => {
    
    const onConfirm = async () => {
      if (!sessionToken) return;

      try {
        await reportsApi.delete(sessionToken, report.id);
        toast.success('Reporte eliminado exitosamente');
        loadReports();
      } catch (error) {
        console.error('Error deleting report:', error);
        toast.error('Error al eliminar reporte');
        throw error; // Re-throw to keep modal open on error
      }
    };

    openModal(
      <ConfirmDeleteModal
        message="¿Estás seguro de que deseas eliminar este reporte?"
        itemName={`Reporte #${report.reportNumber} - ${new Date(report.reportDate).toLocaleDateString()}`}
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
      draft: { icon: Clock, color: 'bg-gray-100 text-gray-700', label: 'Borrador' },
      submitted: { icon: CheckCircle, color: 'bg-blue-100 text-blue-700', label: 'Enviado' },
      approved: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Aprobado' },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Rechazado' },
    };

    const badge = badges[status];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon size={14} />
        {badge.label}
      </span>
    );
  };

  const canEdit = (report: Report) => {
    if (!user) return false;
    
    // Own reports in draft status
    if (report.status === 'draft' && report.createdBy === user.id) return true;
    
    // Admins can edit any
    if (user.role === 'admin') return true;
    
    return false;
  };

  const canDelete = (report: Report) => {
    if (!user) return false;
    
    // Admins can delete any
    if (user.role === 'admin') return true;
    
    // Own drafts
    if (report.status === 'draft' && report.createdBy === user.id) return true;
    
    return false;
  };

  const handleExportToExcel = () => {
    if (reports.length === 0) {
      toast.warning('No hay reportes para exportar');
      return;
    }

    try {
      toast.info(`Exportando ${reports.length} reporte(s)...`, { autoClose: 1000 });
      
      const filename = `reportes_${new Date().toISOString().split('T')[0]}.xlsx`;
      exportReportsToExcel(reports, filename);
      
      toast.success(`${reports.length} reporte(s) exportado(s) exitosamente`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al exportar a Excel: ${errorMessage}`);
    }
  };

  return (
    <MainLayout
      title="Reportes DDR"
      subtitle="Lista de reportes diarios de operaciones"
      headerActions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            icon={<FileSpreadsheet size={16} />}
            disabled={reports.length === 0}
          >
            Exportar Excel
          </Button>
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
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                label="Número de Pozo"
                value={filters.wellNumber}
                onChange={(e) => setFilters({ ...filters, wellNumber: e.target.value })}
                placeholder="Ej: Well-123"
              />

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
                      Compañía
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
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {new Date(report.reportDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {report.wellNumber || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {report.company || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/reports/view/${report.id}`)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Ver"
                          >
                            <Eye size={18} />
                          </button>
                          
                          {canEdit(report) && (
                            <button
                              onClick={() => navigate(`/reports/edit/${report.id}`)}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                          )}
                          
                          {canDelete(report) && (
                            <button
                              onClick={() => handleDelete(report)}
                              className="text-red-600 hover:text-red-800 transition-colors"
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
          )}
        </Card>

        {/* Stats Summary */}
        {reports.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600">Borradores</p>
              <p className="text-2xl font-bold text-gray-700">
                {reports.filter(r => r.status === 'draft').length}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600">Enviados</p>
              <p className="text-2xl font-bold text-blue-700">
                {reports.filter(r => r.status === 'submitted').length}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600">Aprobados</p>
              <p className="text-2xl font-bold text-green-700">
                {reports.filter(r => r.status === 'approved').length}
              </p>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
