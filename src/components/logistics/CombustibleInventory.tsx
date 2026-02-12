import { useState, useEffect } from 'react';
import { Button } from '../ui';
import { ArrowUpDown, FileText, Trash2, Plus, Minus } from 'lucide-react';
import { useModalStore } from '../../store';
import { useAuthStore } from '../../store/authStore';
import { fuelApi } from '../../lib/api';
import { toast } from 'react-toastify';
import { formatDateDMY, formatTimeHM } from '../../lib/dateUtils';
import { CombustibleForm } from './forms/combustible/CombustibleForm';
import { RequestForm } from './forms/requests/RequestForm';
import { InventoryShell } from './InventoryShell';
import { MOVEMENT_LABELS } from '../../types/logistics';
import type { FuelMovement } from '../../types/logistics';

interface CombustibleInventoryProps {
  onUpdate: () => void;
}

export function CombustibleInventory({ onUpdate }: CombustibleInventoryProps) {
  const { openModal } = useModalStore();
  const { sessionToken, user } = useAuthStore();

  const [movements, setMovements] = useState<FuelMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const canDelete = user?.role === 'supervisor' || user?.role === 'admin';

  useEffect(() => {
    if (sessionToken) loadMovements();
  }, [sessionToken, currentPage, pageSize]);

  const loadMovements = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const res = await fuelApi.getMovements(sessionToken, currentPage, pageSize);
      setMovements(res.data);
      setTotalItems(res.total);
      setTotalPages(res.totalPages);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
      toast.error('Error al cargar movimientos');
    } finally { setLoading(false); }
  };

  const handleRegistrar = () => {
    openModal(
      <CombustibleForm onSuccess={() => { loadMovements(); onUpdate(); }} />,
      { title: 'Registrar Movimiento de Combustible', size: 'xl', showCloseButton: true, closeOnOutsideClick: false }
    );
  };

  const handleSolicitar = () => {
    openModal(
      <RequestForm defaultType="fuel" onSuccess={() => onUpdate()} />,
      { title: 'Solicitar Combustible', size: 'md', showCloseButton: true, closeOnOutsideClick: false }
    );
  };

  const handleDelete = async (id: string) => {
    if (!sessionToken) return;
    try {
      await fuelApi.deleteMovement(sessionToken, id);
      toast.success('Movimiento eliminado');
      if (movements.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
      else loadMovements();
      onUpdate();
    } catch (error: any) { toast.error(error?.toString() || 'Error al eliminar'); }
  };

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePageSizeChange = (size: number) => { setPageSize(size); setCurrentPage(1); };

  return (
    <InventoryShell
      title="Combustible"
      loading={loading}
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
            {canDelete && <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {movements.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
              {canDelete && (
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button onClick={() => handleDelete(m.id)} className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Eliminar"><Trash2 size={18} /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </InventoryShell>
  );
}
