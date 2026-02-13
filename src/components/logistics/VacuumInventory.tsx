import { useState, useEffect } from 'react';
import { Button } from '../ui';
import { ArrowUpDown, FileText, Trash2, Eye } from 'lucide-react';
import { useModalStore } from '../../store';
import { useAuthStore } from '../../store/authStore';
import { vacuumApi, usersApi } from '../../lib/api';
import { toast } from 'react-toastify';
import { formatDateDMY, formatTimeHM } from '../../lib/dateUtils';
import { VacuumForm } from './forms/vacuum/VacuumForm';
import { RequestForm } from './forms/requests/RequestForm';
import { InventoryShell } from './InventoryShell';
import ConfirmDeleteModal from '../modals/ConfirmDelete';
import MovementDetailModal, { buildVacuumFields } from '../modals/MovementDetail';
import type { VacuumAction } from '../../types/logistics';

interface VacuumInventoryProps {
  onUpdate: () => void;
}

export function VacuumInventory({ onUpdate }: VacuumInventoryProps) {
  const { openModal } = useModalStore();
  const { sessionToken, user } = useAuthStore();

  const [actions, setActions] = useState<VacuumAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const canManage = user?.role === 'supervisor' || user?.role === 'admin';

  useEffect(() => {
    if (sessionToken) loadActions();
  }, [sessionToken, currentPage, pageSize]);

  const loadActions = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const res = await vacuumApi.getActions(sessionToken, currentPage, pageSize);
      setActions(res.data);
      setTotalItems(res.total);
      setTotalPages(res.totalPages);
    } catch (error) {
      console.error('Error cargando acciones:', error);
      toast.error('Error al cargar acciones');
    } finally { setLoading(false); }
  };

  const handleRegistrar = () => {
    openModal(
      <VacuumForm onSuccess={() => { loadActions(); onUpdate(); }} />,
      { title: 'Registrar Acción de Vacuum', size: 'md', showCloseButton: true, closeOnOutsideClick: false }
    );
  };

  const handleSolicitar = () => {
    openModal(
      <RequestForm defaultType="vacuum" onSuccess={() => onUpdate()} />,
      { title: 'Solicitar Vacuum/Cisterna', size: 'md', showCloseButton: true, closeOnOutsideClick: false }
    );
  };

  const handleDelete = (action: VacuumAction) => {
    const label = `${action.actionName} (${formatDateDMY(action.createdAt?.split('T')[0])})`;

    openModal(
      <ConfirmDeleteModal
        message="¿Estás seguro de que deseas eliminar esta acción?"
        itemName={label}
        onConfirm={async () => {
          if (!sessionToken) return;
          try {
            await vacuumApi.deleteAction(sessionToken, action.id);
            toast.success('Acción eliminada');
            if (actions.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
            else loadActions();
            onUpdate();
          } catch (error: any) {
            toast.error(error?.toString() || 'Error al eliminar');
            throw error;
          }
        }}
      />,
      { title: '¿Eliminar acción?', size: 'sm', showCloseButton: true }
    );
  };

  const handleViewDetail = async (action: VacuumAction) => {
    let createdByName = '—';
    if (sessionToken && action.createdBy) {
      try {
        const u = await usersApi.get(sessionToken, action.createdBy);
        createdByName = u.fullName;
      } catch { /* ignore */ }
    }
    openModal(
      <MovementDetailModal fields={buildVacuumFields(action, createdByName)} />,
      { title: 'Detalle de la Acción', size: 'sm', showCloseButton: true, closeOnOutsideClick: true }
    );
  };

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePageSizeChange = (size: number) => { setPageSize(size); setCurrentPage(1); };

  return (
    <InventoryShell
      title="Vacuum / Cisterna"
      loading={loading}
      isEmpty={actions.length === 0}
      emptyMessage="No hay acciones registradas"
      actions={
        <>
          <Button variant="secondary" size="sm" icon={<ArrowUpDown size={18} />} iconPosition="right" onClick={handleRegistrar}>Registrar</Button>
          <Button variant="outline" size="sm" icon={<FileText size={18} />} iconPosition="right" onClick={handleSolicitar}>Solicitar</Button>
        </>
      }
      pagination={{ currentPage, totalPages, totalItems, pageSize, itemLabel: 'acciones', onPageChange: handlePageChange, onPageSizeChange: handlePageSizeChange }}
    >
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acción</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observaciones</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {actions.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  {a.actionName}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-gray-100">{formatDateDMY(a.createdAt?.split('T')[0])}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{formatTimeHM(a.createdAt)}</div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{a.notes || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-1">
                  <button onClick={() => handleViewDetail(a)} className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Ver detalle">
                    <Eye size={18} />
                  </button>
                  {canManage && (
                    <button onClick={() => handleDelete(a)} className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Eliminar"><Trash2 size={18} /></button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </InventoryShell>
  );
}
