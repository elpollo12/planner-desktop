import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useModal } from '../../store/modalStore';
import { useIncidentsList, useDeleteIncident, useIncidentTypes } from '../../hooks/useIncidents';
import { IncidentTypeBadge } from './IncidentTypeBadge';
import { IncidentForm } from './IncidentForm';
import { IncidentDetail } from './IncidentDetail';
import IncidentTypesCatalogModal from './IncidentTypesCatalogModal';
import ConfirmDeleteModal from '../modals/ConfirmDelete';
import { Button, Select } from '../ui';
import { PaginationControls } from '../ui/PaginationControls';
import { formatDateTime } from '../../lib/dateUtils';
import { toast } from 'react-toastify';
import { Plus, Eye, Trash2, Loader2, AlertTriangle, Settings } from 'lucide-react';

interface IncidentsListProps {
  rigId: string;
  rigName: string | null;
}

const PAGE_SIZE = 10;

export function IncidentsList({ rigId, rigName }: IncidentsListProps) {
  const { user } = useAuthStore();
  const { openModal } = useModal();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [typeFilter, setTypeFilter] = useState('');

  const { data: incidentTypes = [] } = useIncidentTypes();
  const { data, isLoading } = useIncidentsList(rigId, typeFilter, page, pageSize);
  const deleteMutation = useDeleteIncident(rigId);

  const incidents = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // Build filter options from dynamic types
  const typeFilterOptions = [
    { value: '', label: 'Todos los tipos' },
    ...incidentTypes.map((t) => ({ value: t.id, label: t.name })),
  ];

  // Map type ID → record for badge rendering
  const typeMap = new Map(incidentTypes.map((t) => [t.id, t]));

  const handleCreate = () => {
    openModal(<IncidentForm rigId={rigId} />, {
      title: 'Nueva Incidencia',
      size: 'lg',
    });
  };

  const handleView = (incidentId: string) => {
    openModal(<IncidentDetail incidentId={incidentId} rigId={rigId} rigName={rigName} />, {
      title: 'Detalle de Incidencia',
      size: 'xl',
    });
  };

  const handleDelete = (incidentId: string) => {
    openModal(
      <ConfirmDeleteModal
        message="¿Estás seguro de que deseas eliminar esta incidencia?"
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(incidentId);
            toast.success('Incidencia eliminada');
          } catch (error) {
            toast.error(String(error));
            throw error;
          }
        }}
      />,
      { title: 'Eliminar Incidencia', size: 'sm' }
    );
  };

  const handleOpenTypesCatalog = () => {
    openModal(<IncidentTypesCatalogModal />, {
      title: 'Tipos de Incidencia',
      size: 'xl',
      showCloseButton: true,
    });
  };

  const renderTypeBadge = (typeId: string) => {
    const typeRecord = typeMap.get(typeId);
    if (typeRecord) {
      return <IncidentTypeBadge name={typeRecord.name} color={typeRecord.color} />;
    }
    return <IncidentTypeBadge name={typeId} color="gray" />;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            options={typeFilterOptions}
            className="!w-auto min-w-[180px]"
          />
          <Button
            variant="outline"
            size="sm"
            icon={<Settings size={15} />}
            onClick={handleOpenTypesCatalog}
          >
            Ver tipos
          </Button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {total} incidencia{total !== 1 ? 's' : ''}
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={16} />}
          onClick={handleCreate}
        >
          Nueva Incidencia
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && incidents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            No hay incidencias registradas
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Usa el botón "Nueva Incidencia" para crear una
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && incidents.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Tipo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Descripción</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Creado por</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Fecha</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      {renderTypeBadge(incident.incidentType)}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-gray-900 dark:text-gray-100 truncate">
                        {incident.description}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {incident.createdByName ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDateTime(incident.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(incident.id)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        {(user?.role !== 'operator' || incident.createdBy === user?.id) && (
                          <button
                            onClick={() => handleDelete(incident.id)}
                            className="p-1.5 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            itemLabel="incidencias"
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </>
      )}
    </div>
  );
}
