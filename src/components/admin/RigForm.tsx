import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { RigWithArea, CreateRigInput, Area } from '@/types/rig';
import type { Operator } from '@/types/operator';
import { createRigSchema } from '@/schemas/rigSchemas';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

interface RigFormProps {
  onSubmit: (data: CreateRigInput) => Promise<void>;
  rig?: RigWithArea | null;
  areas: Area[];
  operators: Operator[];
}

export default function RigForm({ onSubmit, rig, areas, operators }: RigFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CreateRigInput>({
    resolver: zodResolver(createRigSchema),
    defaultValues: rig || {
      name: '',
      operator: '',
      power: '',
      areaId: undefined,
      active: true, // ← Valor por defecto
    },
  });

  // Observar el valor de active para el Switch
  const activeValue = watch('active');
  const handleFormSubmit = (data: CreateRigInput) => {
    // Convert empty string to undefined for areaId
    const submitData = {
      ...data,
      areaId: data.areaId === '' ? undefined : data.areaId,
    };
    return onSubmit(submitData);
  };

  const areaOptions = [
    { value: '', label: 'Sin área asignada' },
    ...areas
      .filter((area) => area.active)
      .map((area) => ({
        value: area.id,
        label: `${area.name} (${area.country}, ${area.state})`,
      })),
  ];

  const operatorOptions = [
    { value: '', label: 'Selecciona un operador' },
    ...operators
      .filter((op) => op.active)
      .map((op) => ({
        value: op.name,
        label: op.name,
      })),
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Taladro <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Ej: TAL-001"
            error={errors.name?.message}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="operator" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Operador <span className="text-red-500">*</span>
          </label>
          <Select
            id="operator"
            {...register('operator')}
            options={operatorOptions}
            error={errors.operator?.message}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="power" className="block text-sm font-medium text-gray-700 mb-1">
            Potencia <span className="text-red-500">*</span>
          </label>
          <Input
            id="power"
            {...register('power')}
            placeholder="Ej: 2000 HP, 1500 HP"
            error={errors.power?.message}
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500">
            Especifica la potencia del taladro (HP, kW, etc.)
          </p>
        </div>

        <div>
          <label htmlFor="areaId" className="block text-sm font-medium text-gray-700 mb-1">
            Área Geográfica
          </label>
          <Select
            id="areaId"
            {...register('areaId')}
            options={areaOptions}
            error={errors.areaId?.message}
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500">
            Selecciona el área donde opera este taladro (opcional)
          </p>
        </div>

        {/* Campo Active - Switch Component */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <label htmlFor="active" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado del Taladro
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeValue 
                ? 'El taladro está activo y disponible para asignación'
                : 'El taladro está inactivo y no aparecerá en las listas'}
            </p>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              {...register('active')}
              className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}