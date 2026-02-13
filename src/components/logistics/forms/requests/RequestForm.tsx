import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClipboardSignature } from 'lucide-react';
import { useModalStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { logisticsRequestsApi } from '@/lib/api';
import { toast } from 'react-toastify';
import { logisticsRequestSchema, type LogisticsRequestForm } from '@/schemas';
import { REQUEST_TYPE_LABELS } from '@/types/logistics';
import { Button } from '@/components/ui';
import { capitalize } from '@/lib/stringUtils';
import type { Material, RequestType } from '@/types/logistics';

interface RequestFormProps {
  onSuccess?: () => void;
  defaultType?: RequestType;
  materials?: Material[];
}

export function RequestForm({ onSuccess, defaultType, materials = [] }: RequestFormProps) {
  const sessionToken = useAuthStore((s) => s.sessionToken);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogisticsRequestForm>({
    resolver: zodResolver(logisticsRequestSchema),
    defaultValues: {
      requestType: defaultType || ('' as RequestType),
      quantity: undefined,
      actionRequested: '',
      materialId: '',
      notes: '',
    },
  });

  const type = watch('requestType');

  const onFormSubmit = async (data: LogisticsRequestForm) => {
    if (!sessionToken) return;
    try {
      await logisticsRequestsApi.create(sessionToken, {
        requestType: data.requestType,
        quantity: data.requestType !== 'vacuum' ? data.quantity : undefined,
        actionRequested: data.requestType === 'vacuum' ? data.actionRequested?.trim() : undefined,
        materialId: data.requestType === 'material' ? data.materialId : undefined,
        notes: data.notes || undefined,
      });
      toast.success('Solicitud creada exitosamente');
      onSuccess?.();
      useModalStore.getState().closeModal();
    } catch (error: any) {
      toast.error(error?.toString() || 'Error al crear solicitud');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
          <ClipboardSignature className="text-indigo-600 dark:text-indigo-400" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nueva Solicitud</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Crear una solicitud de logística</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {/* Tipo de solicitud */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo de Solicitud <span className="text-red-500">*</span>
            </label>
            <select
              {...register('requestType', {
                onChange: () => {
                  // Reset dependent fields when type changes
                  reset((prev) => ({
                    ...prev,
                    quantity: undefined,
                    actionRequested: '',
                    materialId: '',
                  }), { keepErrors: false });
                },
              })}
              className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 ${
                errors.requestType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">Seleccionar tipo</option>
              {Object.entries(REQUEST_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {errors.requestType && <p className="mt-1 text-sm text-red-500">{errors.requestType.message}</p>}
          </div>

          {/* Campos dinámicos según tipo */}
          {(type === 'water_bottles' || type === 'fuel') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cantidad {type === 'fuel' ? '(Litros)' : '(Botellones)'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step={type === 'fuel' ? '0.01' : '1'}
                min="0"
                {...register('quantity', { valueAsNumber: true })}
                className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="0"
              />
              {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity.message}</p>}
            </div>
          )}

          {type === 'material' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Material <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('materialId')}
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 ${
                    errors.materialId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Seleccionar material</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{capitalize(m.name)} ({m.unit})</option>
                  ))}
                </select>
                {errors.materialId && <p className="mt-1 text-sm text-red-500">{errors.materialId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cantidad <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('quantity', { valueAsNumber: true })}
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0"
                />
                {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity.message}</p>}
              </div>
            </>
          )}

          {type === 'vacuum' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Acción Solicitada <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('actionRequested')}
                className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 ${
                  errors.actionRequested ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Ej: Limpieza de cisterna..."
              />
              {errors.actionRequested && <p className="mt-1 text-sm text-red-500">{errors.actionRequested.message}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              placeholder="Observaciones adicionales..."
            />
            {errors.notes && <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={() => useModalStore.getState().closeModal()} variant="outline">
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} icon={<ClipboardSignature size={16} />}>
            {isSubmitting ? 'Creando...' : 'Crear Solicitud'}
          </Button>
        </div>
      </form>
    </div>
  );
}
