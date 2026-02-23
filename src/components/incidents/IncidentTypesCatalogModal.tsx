import { useState, useMemo } from 'react';
import { Trash2, List, PlusCircle } from 'lucide-react';
import { useModal } from '../../store/modalStore';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui';
import { PaginationControls } from '../ui/PaginationControls';
import { toast } from 'react-toastify';
import {
  useIncidentTypes,
  useCreateIncidentType,
  useDeleteIncidentType,
} from '../../hooks/useIncidents';
import { IncidentTypeBadge } from './IncidentTypeBadge';
import {
  INCIDENT_TYPE_BADGE_COLORS,
  INCIDENT_TYPE_COLOR_LABELS,
} from '../../types/incident';

type TabId = 'list' | 'create';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'list', label: 'Listado', icon: <List size={15} /> },
  { id: 'create', label: 'Nuevo Tipo', icon: <PlusCircle size={15} /> },
];

export default function IncidentTypesCatalogModal() {
  const { closeModal } = useModal();
  const { user } = useAuthStore();
  const { data: types = [], isLoading } = useIncidentTypes();
  const createMutation = useCreateIncidentType();
  const deleteMutation = useDeleteIncidentType();

  const [activeTab, setActiveTab] = useState<TabId>('list');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('gray');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const canDelete = user?.role === 'admin' || user?.role === 'supervisor';

  const totalItems = types.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedTypes = useMemo(() => {
    const start = (page - 1) * pageSize;
    return types.slice(start, start + pageSize);
  }, [types, page, pageSize]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { toast.error('El nombre es requerido'); return; }
    try {
      await createMutation.mutateAsync({ name, color: newColor });
      toast.success('Tipo de incidencia creado');
      setNewName('');
      setNewColor('gray');
      setActiveTab('list');
    } catch (error) {
      toast.error(String(error));
    }
  };

  const handleDelete = async (typeId: string) => {
    try {
      await deleteMutation.mutateAsync(typeId);
      toast.success('Tipo de incidencia eliminado');
      setConfirmDeleteId(null);
      // Adjust page if current is now empty
      const newTotal = types.length - 1;
      const newTotalPages = Math.ceil(newTotal / pageSize) || 1;
      if (page > newTotalPages) setPage(newTotalPages);
    } catch (error) {
      toast.error(String(error));
    }
  };

  return (
    <div className="-mt-2">
      {/* Custom Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-5">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                border-b-2 transition-colors cursor-pointer
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── TAB: Listado ── */}
      {activeTab === 'list' && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-300 border-t-amber-500" />
            </div>
          ) : types.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No hay tipos registrados.
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="mt-2 text-sm text-primary-500 hover:text-primary-600 font-medium cursor-pointer"
              >
                Crear el primero →
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700/60">
                      <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nombre</th>
                      <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Color</th>
                      <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vista previa</th>
                      {canDelete && (
                        <th className="text-center py-2.5 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedTypes.map((t) => {
                      const isConfirming = confirmDeleteId === t.id;
                      return (
                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-gray-900 dark:text-gray-100">{t.name}</td>
                          <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">
                            {INCIDENT_TYPE_COLOR_LABELS[t.color] ?? t.color}
                          </td>
                          <td className="py-2.5 px-4">
                            <IncidentTypeBadge name={t.name} color={t.color} />
                          </td>
                          {canDelete && (
                            <td className="py-2.5 px-4 text-center">
                              {isConfirming ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleDelete(t.id)}
                                    disabled={deleteMutation.isPending}
                                    className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 cursor-pointer"
                                  >
                                    {deleteMutation.isPending ? '...' : 'Sí'}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(t.id)}
                                  className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                                  title="Eliminar tipo"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                itemLabel="tipos"
                pageSizeOptions={[5, 10, 20]}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
              />
            </>
          )}
        </>
      )}

      {/* ── TAB: Nuevo Tipo ── */}
      {activeTab === 'create' && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Derrame, Accidente vehicular..."
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color del badge
            </label>
            <div className="flex flex-wrap gap-2">
              {INCIDENT_TYPE_BADGE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`
                    rounded-lg border-2 px-1 py-0.5 transition-all cursor-pointer
                    ${newColor === c
                      ? 'border-primary-500 ring-2 ring-primary-500/20 scale-105'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    }
                  `}
                >
                  <IncidentTypeBadge name={INCIDENT_TYPE_COLOR_LABELS[c] ?? c} color={c} size="sm" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-700/40 rounded-lg p-4 flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Vista previa:</span>
            <IncidentTypeBadge name={newName || 'Nombre del tipo'} color={newColor} size="md" />
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={!newName.trim()}
            >
              Crear Tipo
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={closeModal}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
