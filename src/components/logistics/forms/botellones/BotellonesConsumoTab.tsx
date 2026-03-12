import { Droplets } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { waterBottlesApi } from '@/lib/api';
import { waterBottlesMovementSchema, type WaterBottlesMovementForm } from '@/schemas';
import { MovementFormTab } from '../MovementFormTab';
import { useQueryClient } from '@tanstack/react-query';
import { logisticsKeys } from '@/hooks/useLogistics';

interface BotellonesConsumoTabProps {
  rigId: string;
  onSuccess?: () => void;
}

export function BotellonesConsumoTab({ rigId, onSuccess }: BotellonesConsumoTabProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  return (
    <MovementFormTab<WaterBottlesMovementForm>
      direction="exit"
      schema={waterBottlesMovementSchema}
      defaultValues={{ quantity: undefined as unknown as number, notes: '' }}
      bannerText={t('logistics.waterBottles.consumptionBanner')}
      icon={Droplets}
      successMessage={t('logistics.waterBottles.consumptionSuccess')}
      errorMessage={t('logistics.waterBottles.consumptionError')}
      submitLabel={t('logistics.common.registerConsumption')}
      onSubmit={async (sessionToken, data) => {
        await waterBottlesApi.createMovement(sessionToken, rigId, {
          movementType: 'exit',
          quantity: data.quantity,
          notes: data.notes || undefined,
        });
        qc.invalidateQueries({ queryKey: logisticsKeys.water(rigId) });
        qc.invalidateQueries({ queryKey: logisticsKeys.pendingCount(rigId) });
      }}
      onSuccess={onSuccess}
      renderFields={({ register, errors }) => (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('logistics.waterBottles.quantityLabel')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Droplets className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="number"
                min="1"
                step="1"
                {...register('quantity', { valueAsNumber: true })}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="0"
              />
            </div>
            {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('logistics.common.notes')}</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              placeholder={t('logistics.common.notesPlaceholder')}
            />
          </div>
        </>
      )}
    />
  );
}
