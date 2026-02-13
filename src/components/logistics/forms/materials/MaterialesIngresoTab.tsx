import { Package } from 'lucide-react';
import { materialsApi } from '@/lib/api';
import { materialMovementSchema, type MaterialMovementForm } from '@/schemas';
import { MovementFormTab } from '../MovementFormTab';
import { MaterialSearchInput } from './MaterialSearchInput';
import type { Material } from '@/types/logistics';

interface Props {
  rigId: string;
  onSuccess?: () => void;
  materials: Material[];
}

export function MaterialesIngresoTab({ rigId, onSuccess, materials }: Props) {
  return (
    <MovementFormTab<MaterialMovementForm>
      direction="entry"
      schema={materialMovementSchema}
      defaultValues={{ materialId: '', quantity: undefined as unknown as number, notes: '' }}
      bannerText="Registrar ingreso de material al inventario"
      icon={Package}
      successMessage="Ingreso de material registrado"
      errorMessage="Error al registrar el ingreso"
      submitLabel="Registrar Ingreso"
      onSubmit={async (sessionToken, data) => {
        await materialsApi.createMovement(sessionToken, rigId, {
          materialId: data.materialId,
          movementType: 'entry',
          quantity: data.quantity,
          notes: data.notes || undefined,
        });
      }}
      onSuccess={onSuccess}
      renderFields={({ register, errors, watch, setValue }) => {
        const materialId = watch('materialId');
        const selectedMaterial = materials.find((m) => m.id === materialId);

        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Material <span className="text-red-500">*</span>
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
                Cantidad {selectedMaterial ? `(${selectedMaterial.unit})` : ''} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('quantity', { valueAsNumber: true })}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </>
        );
      }}
    />
  );
}
