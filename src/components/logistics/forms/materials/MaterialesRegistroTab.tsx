import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Ruler } from 'lucide-react';
import { useModalStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { materialsApi } from '@/lib/api';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { logisticsKeys } from '@/hooks/useLogistics';
import { createMaterialSchema, type CreateMaterialForm } from '@/schemas';
import { Button } from '@/components/ui/Button';

interface Props {
  onSuccess?: () => void;
}

export function MaterialesRegistroTab({ onSuccess }: Props) {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateMaterialForm>({
    resolver: zodResolver(createMaterialSchema),
    defaultValues: { name: '', unit: '', description: '' },
  });

  const onFormSubmit = async (data: CreateMaterialForm) => {
    if (!sessionToken) return;
    try {
      await materialsApi.create(sessionToken, {
        name: data.name,
        unit: data.unit,
        description: data.description || undefined,
      });
      toast.success('Material registrado exitosamente');
      qc.invalidateQueries({ queryKey: logisticsKeys.materialsCatalog() });
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.toString() || 'Error al registrar');
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg mb-4">
        <p className="text-sm text-green-700 dark:text-green-400">Registrar un nuevo tipo de material en el catálogo</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nombre del Material <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              {...register('name')}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder='Ej: Cemento, Tubería 4", Grasa...'
            />
          </div>
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Unidad de Medida <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              {...register('unit')}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.unit ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Ej: kg, unidades, metros, litros..."
            />
          </div>
          {errors.unit && <p className="mt-1 text-sm text-red-500">{errors.unit.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
          <textarea
            {...register('description')}
            rows={3}
            className={`w-full px-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Descripción del material..."
          />
          {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={() => useModalStore.getState().closeModal()} variant="outline">
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} icon={<Package size={16} />} className="bg-blue-500!">
          {isSubmitting ? 'Registrando...' : 'Registrar Material'}
        </Button>
      </div>
    </form>
  );
}
