import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { Container, ClipboardList } from 'lucide-react';
import { useModalStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { vacuumApi } from '@/lib/api';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { logisticsKeys } from '@/hooks/useLogistics';
import { vacuumActionSchema, type VacuumActionForm } from '@/schemas';
import { Button } from '@/components/ui/Button';

interface VacuumFormProps {
  rigId: string;
  onSuccess?: () => void;
}

export function VacuumForm({ rigId, onSuccess }: VacuumFormProps) {
  const { t } = useTranslation();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VacuumActionForm>({
    resolver: zodResolver(vacuumActionSchema),
    defaultValues: { actionName: '', notes: '' },
  });

  const onFormSubmit = async (data: VacuumActionForm) => {
    if (!sessionToken) return;
    try {
      await vacuumApi.createAction(sessionToken, rigId, {
        actionName: data.actionName,
        notes: data.notes || undefined,
      });
      qc.invalidateQueries({ queryKey: logisticsKeys.vacuum(rigId) });
      qc.invalidateQueries({ queryKey: logisticsKeys.pendingCount(rigId) });
      toast.success(t('logistics.vacuum.actionRegistered'));
      onSuccess?.();
      useModalStore.getState().closeModal();
    } catch (error) {
      console.error('Error registrando acción:', error);
      toast.error(t('logistics.vacuum.actionRegisterError'));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
          <Container className="text-purple-600 dark:text-purple-400" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('logistics.vacuum.title')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('logistics.vacuum.registerDesc')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg mb-4">
          <p className="text-sm text-purple-700 dark:text-purple-400">
            {t('logistics.vacuum.actionBanner')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('logistics.vacuum.actionPerformed')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <ClipboardList className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                {...register('actionName')}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.actionName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder={t('logistics.vacuum.actionPlaceholder')}
              />
            </div>
            {errors.actionName && <p className="mt-1 text-sm text-red-500">{errors.actionName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('logistics.common.notes')}</label>
            <textarea
              {...register('notes')}
              rows={3}
              className={`w-full px-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 ${
                errors.notes ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder={t('logistics.common.notesPlaceholder')}
            />
            {errors.notes && <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={() => useModalStore.getState().closeModal()} variant="outline">
            {t('logistics.common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting} icon={<Container size={16} />}>
            {isSubmitting ? t('logistics.common.registering') : t('logistics.vacuum.registerActionBtn')}
          </Button>
        </div>
      </form>
    </div>
  );
}
