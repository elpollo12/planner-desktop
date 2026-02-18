import { Fuel } from 'lucide-react';
import { fuelApi } from '@/lib/api';
import { fuelMovementSchema, type FuelMovementForm } from '@/schemas';
import { MovementFormTab } from '../MovementFormTab';
import { useQueryClient } from '@tanstack/react-query';
import { logisticsKeys } from '@/hooks/useLogistics';

interface CombustibleConsumoTabProps {
  rigId: string;
  onSuccess?: () => void;
}

export function CombustibleConsumoTab({ rigId, onSuccess }: CombustibleConsumoTabProps) {
  const qc = useQueryClient();

  return (
    <MovementFormTab<FuelMovementForm>
      direction="exit"
      schema={fuelMovementSchema}
      defaultValues={{ amount: undefined as unknown as number, notes: '' }}
      bannerText="Registrar consumo o gasto de combustible"
      icon={Fuel}
      successMessage="Gasto de combustible registrado"
      errorMessage="Error al registrar el gasto"
      submitLabel="Registrar Consumo"
      onSubmit={async (sessionToken, data) => {
        await fuelApi.createMovement(sessionToken, rigId, {
          movementType: 'exit',
          amount: data.amount,
          notes: data.notes || undefined,
        });
        qc.invalidateQueries({ queryKey: logisticsKeys.fuel(rigId) });
        qc.invalidateQueries({ queryKey: logisticsKeys.pendingCount(rigId) });
      }}
      onSuccess={onSuccess}
      renderFields={({ register, errors }) => (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cantidad (Litros) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Fuel className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('amount', { valueAsNumber: true })}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount.message}</p>}
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
