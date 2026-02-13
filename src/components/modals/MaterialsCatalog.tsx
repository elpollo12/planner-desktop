import { useState, useEffect, useMemo } from 'react';
import { Package, Trash2 } from 'lucide-react';
import { useModal } from '../../store/modalStore';
import { Button } from '../ui';
import { PaginationControls } from '../logistics/PaginationControls';
import { materialsApi, usersApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-toastify';
import { formatDateDMY } from '../../lib/dateUtils';
import { capitalize } from '../../lib/stringUtils';
import type { Material } from '../../types/logistics';

interface MaterialsCatalogModalProps {
  onUpdate: () => void;
}

interface MaterialRow extends Material {
  stock: number | null;
  createdByName: string;
}

export default function MaterialsCatalogModal({ onUpdate }: MaterialsCatalogModalProps) {
  const { closeModal } = useModal();
  const { sessionToken } = useAuthStore();

  const [rows, setRows] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const materials = await materialsApi.list(sessionToken, false);

      const enriched: MaterialRow[] = await Promise.all(
        materials.map(async (mat) => {
          let stock: number | null = null;
          let createdByName = '—';

          try {
            stock = await materialsApi.getStock(sessionToken, mat.id);
          } catch { /* ignore */ }

          if (mat.createdBy) {
            try {
              const u = await usersApi.get(sessionToken, mat.createdBy);
              createdByName = u.fullName;
            } catch { /* ignore */ }
          }

          return { ...mat, stock, createdByName };
        })
      );

      setRows(enriched);
    } catch (error) {
      console.error('Error cargando catálogo:', error);
      toast.error('Error al cargar catálogo de materiales');
    } finally {
      setLoading(false);
    }
  };

  // Client-side pagination
  const totalItems = rows.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePageSizeChange = (size: number) => { setPageSize(size); setCurrentPage(1); };

  const handleDelete = async (materialId: string) => {
    if (!sessionToken) return;
    setDeletingId(materialId);
    try {
      await materialsApi.delete(sessionToken, materialId);
      toast.success('Material eliminado del catálogo');
      const updated = rows.filter(r => r.id !== materialId);
      setRows(updated);
      setConfirmDeleteId(null);
      // Adjust page if current page is now empty
      const newTotalPages = Math.ceil(updated.length / pageSize) || 1;
      if (currentPage > newTotalPages) setCurrentPage(newTotalPages);
      onUpdate();
    } catch (error: any) {
      toast.error(error?.toString() || 'Error al eliminar material');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header icon */}
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <Package className="w-6 h-6 text-orange-600 dark:text-orange-400" />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
          No hay materiales registrados en el catálogo.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Material</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unidad</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Creado por</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedRows.map((r) => {
                  const isConfirming = confirmDeleteId === r.id;
                  const isDeleting = deletingId === r.id;
                  const stockDisplay = r.stock !== null
                    ? (Number.isInteger(r.stock) ? r.stock : r.stock.toFixed(2))
                    : '—';
                  const stockColor = r.stock !== null && r.stock <= 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-gray-100';

                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{capitalize(r.name)}</div>
                        {r.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{r.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.unit}</td>
                      <td className={`px-4 py-3 text-sm font-semibold text-right ${stockColor}`}>{stockDisplay}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.createdByName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDateDMY(r.createdAt?.split('T')[0])}</td>
                      <td className="px-4 py-3 text-center">
                        {isConfirming ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleDelete(r.id)}
                              disabled={isDeleting}
                              className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                            >
                              {isDeleting ? '...' : 'Sí'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isDeleting}
                              className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded disabled:opacity-50"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(r.id)}
                            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Eliminar material"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            itemLabel="materiales"
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}

      {/* Footer */}
      <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={closeModal}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
