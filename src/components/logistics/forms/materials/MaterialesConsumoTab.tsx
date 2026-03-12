import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import { materialsApi } from '@/lib/api';
import { materialMovementSchema, type MaterialMovementForm } from '@/schemas';
import { MovementFormTab } from '../MovementFormTab';
import { MaterialSearchInput } from './MaterialSearchInput';
import { useQueryClient } from '@tanstack/react-query';
import { logisticsKeys } from '@/hooks/useLogistics';
import type { Material } from '@/types/logistics';

interface Props {
  rigId: string;
  onSuccess?: () => void;
  materials: Material[];
}

export function MaterialesConsumoTab({ rigId, onSuccess, materials }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  return (
    <MovementFormTab<MaterialMovementForm>
      direction="exit"
      schema={materialMovementSchema}
      defaultValues={{ materialId: '', quantity: undefined as unknown as number, notes: '' }}
      bannerText={t('logistics.materials.consumptionBanner')}
      icon={Package}
      successMessage={t('logistics.materials.consumptionSuccess')}
      errorMessage={t('logistics.materials.consumptionError')}
      submitLabel={t('logistics.common.registerConsumption')}
      onSubmit={async (sessionToken, data) => {
        await materialsApi.createMovement(sessionToken, rigId, {
          materialId: data.materialId,
          movementType: 'exit',
          quantity: data.quantity,
          notes: data.notes || undefined,
        });
        qc.invalidateQueries({ queryKey: logisticsKeys.materials(rigId) });
        qc.invalidateQueries({ queryKey: logisticsKeys.materialsCatalog() });
        qc.invalidateQueries({ queryKey: logisticsKeys.pendingCount(rigId) });
      }}
      onSuccess={onSuccess}
      renderFields={({ register, errors, watch, setValue }) => {
        const materialId = watch('materialId');
        const selectedMaterial = materials.find((m) => m.id === materialId);

        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('logistics.materials.materialLabel')} <span className="text-red-500">*</span>
              </label>
              <MaterialSearchInput
                materials={materials}
                value={materialId}
                onChange={(id) => setValue('materialId', id as any, { shouldValidate: true })}
                error={errors.materialId?.message}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('logistics.common.quantity')} {selectedMaterial ? `(${selectedMaterial.unit})` : ''} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('quantity', { valueAsNumber: true })}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0.00"
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
        );
      }}
    />
  );
}
