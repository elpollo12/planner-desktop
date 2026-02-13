import { Droplets } from 'lucide-react';
import { waterBottlesApi } from '@/lib/api';
import { waterBottlesMovementSchema, type WaterBottlesMovementForm } from '@/schemas';
import { MovementFormTab } from '../MovementFormTab';

interface BotellonesIngresoTabProps {
  rigId: string;
  onSuccess?: () => void;
}

export function BotellonesIngresoTab({ rigId, onSuccess }: BotellonesIngresoTabProps) {
  return (
    <MovementFormTab<WaterBottlesMovementForm>
      direction="entry"
      schema={waterBottlesMovementSchema}
      defaultValues={{ quantity: undefined as unknown as number, notes: '' }}
      bannerText="Registrar ingreso de botellones al inventario"
      icon={Droplets}
      successMessage="Ingreso de botellones registrado"
      errorMessage="Error al registrar el ingreso"
      submitLabel="Registrar Ingreso"
      onSubmit={async (sessionToken, data) => {
        await waterBottlesApi.createMovement(sessionToken, rigId, {
          movementType: 'entry',
          quantity: data.quantity,
          notes: data.notes || undefined,
        });
      }}
      onSuccess={onSuccess}
      renderFields={({ register, errors }) => (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cantidad de Botellones <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Droplets className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="number"
                min="1"
                step="1"
                {...register('quantity', { valueAsNumber: true })}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="0"
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
      )}
    />
  );
}
