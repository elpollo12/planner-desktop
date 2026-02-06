import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { RigWithArea, CreateRigInput, Area } from '@/types/rig';
import { createRigSchema } from '@/schemas/rigSchemas';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

interface RigFormProps {
  onSubmit: (data: CreateRigInput) => Promise<void>;
  rig?: RigWithArea | null;
  areas: Area[];
}

export default function RigForm({ onSubmit, rig, areas }: RigFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateRigInput>({
    resolver: zodResolver(createRigSchema),
    defaultValues: rig || {
      name: '',
      operator: '',
      power: '',
      areaId: undefined,
    },
  });

  const areaOptions = [
    { value: '', label: 'Sin área asignada' },
    ...areas
      .filter((area) => area.active)
      .map((area) => ({
        value: area.id,
        label: `${area.name} (${area.country}, ${area.state})`,
      })),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        <label htmlFor="operator" className="block text-sm font-medium text-gray-700 mb-1">
          Operador <span className="text-red-500">*</span>
        </label>
        <Input
          id="operator"
          {...register('operator')}
          placeholder="Ej: PDVSA, Chevron, Shell"
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

      <div className="flex justify-end gap-3 pt-4 border-t">
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
