import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';
import { ArrowUpDown, FileText, Trash2, Eye } from 'lucide-react';
import { useModalStore } from '../../store';
import { useAuthStore } from '../../store/authStore';
import { usersApi } from '../../lib/api';
import { toast } from 'react-toastify';
import { formatDateDMY, formatTimeHM } from '../../lib/dateUtils';
import { useVacuumActions, useDeleteVacuumAction } from '../../hooks/useLogistics';
import { VacuumForm } from './forms/vacuum/VacuumForm';
import { RequestForm } from './forms/requests/RequestForm';
import { InventoryShell } from './InventoryShell';
import ConfirmDeleteModal from '../modals/ConfirmDelete';
import MovementDetailModal, { buildVacuumFields } from '../modals/MovementDetail';
import type { VacuumAction } from '../../types/logistics';

interface VacuumInventoryProps {
  rigId: string;
}

export function VacuumInventory({ rigId }: VacuumInventoryProps) {
  const { t } = useTranslation();
  const { openModal } = useModalStore();
  const { sessionToken, user } = useAuthStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const { data: actionsData, isLoading } = useVacuumActions(rigId, currentPage, pageSize);
  const deleteMutation = useDeleteVacuumAction(rigId);

  const actions = actionsData?.data ?? [];
  const totalItems = actionsData?.total ?? 0;
  const totalPages = actionsData?.totalPages ?? 0;
  const canManage = user?.role === 'supervisor' || user?.role === 'admin';

  const handleRegistrar = () => {
    openModal(
      <VacuumForm rigId={rigId} />,
      { title: t('logistics.vacuum.registerAction'), size: 'md', showCloseButton: true, closeOnOutsideClick: false }
    );
  };

  const handleSolicitar = () => {
    openModal(
      <RequestForm rigId={rigId} defaultType="vacuum" />,
      { title: t('logistics.vacuum.requestTitle'), size: 'md', showCloseButton: true, closeOnOutsideClick: false }
    );
  };

  const handleDelete = (action: VacuumAction) => {
    const label = `${action.actionName} (${formatDateDMY(action.createdAt?.split('T')[0])})`;

    openModal(
      <ConfirmDeleteModal
        message={t('logistics.vacuum.confirmDeleteAction')}
        itemName={label}
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(action.id);
            toast.success(t('logistics.vacuum.actionDeleted'));
            if (actions.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
          } catch (error: any) {
            toast.error(error?.toString() || t('logistics.common.deleteError'));
            throw error;
          }
        }}
      />,
      { title: t('logistics.vacuum.deleteAction'), size: 'sm', showCloseButton: true }
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
      { title: t('logistics.vacuum.actionDetail'), size: 'sm', showCloseButton: true, closeOnOutsideClick: true }
    );
  };

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePageSizeChange = (size: number) => { setPageSize(size); setCurrentPage(1); };

  return (
    <InventoryShell
      title={t('logistics.vacuum.title')}
      loading={isLoading}
      isEmpty={actions.length === 0}
      emptyMessage={t('logistics.vacuum.noActions')}
      actions={
        <>
          <Button variant="secondary" size="sm" icon={<ArrowUpDown size={18} />} iconPosition="right" onClick={handleRegistrar}>{t('logistics.common.register')}</Button>
          <Button variant="outline" size="sm" icon={<FileText size={18} />} iconPosition="right" onClick={handleSolicitar}>{t('logistics.common.request')}</Button>
        </>
      }
      pagination={{ currentPage, totalPages, totalItems, pageSize, itemLabel: t('logistics.vacuum.actionsLabel'), onPageChange: handlePageChange, onPageSizeChange: handlePageSizeChange }}
    >
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('logistics.vacuum.actionColumn')}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('logistics.common.date')}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('logistics.common.notes')}</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('logistics.common.actions')}</th>
          </tr>
        </thead>
        <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {actions.map((a) => (
            <tr key={a.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
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
                  <button onClick={() => handleViewDetail(a)} className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title={t('logistics.common.viewDetail')}>
                    <Eye size={18} />
                  </button>
                  {canManage && (
                    <button onClick={() => handleDelete(a)} className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title={t('logistics.common.delete')}><Trash2 size={18} /></button>
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
