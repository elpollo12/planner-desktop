import { useState } from 'react';
import { Button } from '../ui';
import { ArrowUpDown, FileText, Trash2, Plus, Minus, Eye } from 'lucide-react';
import { useModalStore } from '../../store';
import { useAuthStore } from '../../store/authStore';
import { usersApi } from '../../lib/api';
import { toast } from 'react-toastify';
import { formatDateDMY, formatTimeHM } from '../../lib/dateUtils';
import { useFuelMovements, useFuelStock, useDeleteFuelMovement } from '../../hooks/useLogistics';
import { CombustibleForm } from './forms/combustible/CombustibleForm';
import { RequestForm } from './forms/requests/RequestForm';
import { InventoryShell } from './InventoryShell';
import { StockBadge } from './StockBadge';
import ConfirmDeleteModal from '../modals/ConfirmDelete';
import MovementDetailModal, { buildFuelFields } from '../modals/MovementDetail';
import { MOVEMENT_LABELS } from '../../types/logistics';
import type { FuelMovement } from '../../types/logistics';

interface CombustibleInventoryProps {
  rigId: string;
}

export function CombustibleInventory({ rigId }: CombustibleInventoryProps) {
  const { openModal } = useModalStore();
  const { sessionToken, user } = useAuthStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const { data: movementsData, isLoading } = useFuelMovements(rigId, currentPage, pageSize);
  const { data: stock } = useFuelStock(rigId);
  const deleteMutation = useDeleteFuelMovement(rigId);

  const movements = movementsData?.data ?? [];
  const totalItems = movementsData?.total ?? 0;
  const totalPages = movementsData?.totalPages ?? 0;
  const canDelete = user?.role === 'supervisor' || user?.role === 'admin';

  const handleRegistrar = () => {
    openModal(
      <CombustibleForm rigId={rigId} />,
      { title: 'Registrar Movimiento de Combustible', size: 'xl', showCloseButton: true, closeOnOutsideClick: false }
    );
  };

  const handleSolicitar = () => {
    openModal(
      <RequestForm rigId={rigId} defaultType="fuel" />,
      { title: 'Solicitar Combustible', size: 'md', showCloseButton: true, closeOnOutsideClick: false }
    );
  };

  const handleDelete = (movement: FuelMovement) => {
    const label = `${MOVEMENT_LABELS[movement.movementType as keyof typeof MOVEMENT_LABELS]} — ${movement.amount.toFixed(2)} litros (${formatDateDMY(movement.createdAt?.split('T')[0])})`;

    openModal(
      <ConfirmDeleteModal
        message="¿Estás seguro de que deseas eliminar este registro?"
        itemName={label}
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(movement.id);
            toast.success('Registro eliminado');
            if (movements.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
          } catch (error: any) {
            toast.error(error?.toString() || 'Error al eliminar');
            throw error;
          }
        }}
      />,
      { title: '¿Eliminar movimiento?', size: 'sm', showCloseButton: true }
    );
  };

  const handleViewDetail = async (movement: FuelMovement) => {
    let createdByName = '—';
    if (sessionToken && movement.createdBy) {
      try {
        const u = await usersApi.get(sessionToken, movement.createdBy);
        createdByName = u.fullName;
      } catch { /* ignore */ }
    }
    openModal(
      <MovementDetailModal fields={buildFuelFields(movement, createdByName)} />,
      { title: 'Detalle del Movimiento', size: 'sm', showCloseButton: true, closeOnOutsideClick: true }
    );
  };

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePageSizeChange = (size: number) => { setPageSize(size); setCurrentPage(1); };

  return (
    <InventoryShell
      title="Combustible"
      stockBadge={<StockBadge stock={stock ?? null} unit="litros" />}
      loading={isLoading}
      isEmpty={movements.length === 0}
      emptyMessage="No hay movimientos registrados"
      actions={
        <>
          <Button variant="secondary" size="sm" icon={<ArrowUpDown size={18} />} iconPosition="right" onClick={handleRegistrar}>Registrar</Button>
          <Button variant="outline" size="sm" icon={<FileText size={18} />} iconPosition="right" onClick={handleSolicitar}>Solicitar</Button>
        </>
      }
      pagination={{ currentPage, totalPages, totalItems, pageSize, itemLabel: 'movimientos', onPageChange: handlePageChange, onPageSizeChange: handlePageSizeChange }}
    >
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cantidad</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observaciones</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {movements.map((m) => (
            <tr key={m.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  m.movementType === 'entry' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {m.movementType === 'entry' ? <Plus size={12} /> : <Minus size={12} />}
                  {MOVEMENT_LABELS[m.movementType as keyof typeof MOVEMENT_LABELS]}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{m.amount.toFixed(2)} litros</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-gray-100">{formatDateDMY(m.createdAt?.split('T')[0])}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{formatTimeHM(m.createdAt)}</div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{m.notes || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-1">
                  <button onClick={() => handleViewDetail(m)} className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Ver detalle">
                    <Eye size={18} />
                  </button>
                  {canDelete && (
                    <button onClick={() => handleDelete(m)} className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Eliminar"><Trash2 size={18} /></button>
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
