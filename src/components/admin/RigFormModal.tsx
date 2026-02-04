import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { RigWithArea, CreateRigInput, UpdateRigInput, Area } from '@/types/rig';
import { createRigSchema, updateRigSchema } from '@/schemas';
import { DialogModal } from '@/components/ui/DialogModal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

interface RigFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRigInput | UpdateRigInput) => Promise<void>;
  rig?: RigWithArea | null;
  areas: Area[];
  isLoading?: boolean;
}

export default function RigFormModal({
  isOpen,
  onClose,
  onSubmit,
  rig,
  areas,
  isLoading = false,
}: RigFormModalProps) {
  const isEditMode = !!rig;
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateRigInput | UpdateRigInput>({
    resolver: zodResolver(isEditMode ? updateRigSchema : createRigSchema),
    defaultValues: {
      name: '',
      operator: '',
      power: '',
      areaId: undefined,
    },
  });

  // Reset form when modal opens with rig data
  useEffect(() => {
    if (isOpen) {
      if (rig) {
        reset({
          name: rig.name,
          operator: rig.operator,
          power: rig.power,
          areaId: rig.areaId || undefined,
        });
      } else {
        reset({
          name: '',
          operator: '',
          power: '',
          areaId: undefined,
        });
      }
    }
  }, [isOpen, rig, reset]);

  const handleFormSubmit = async (data: CreateRigInput | UpdateRigInput) => {
    await onSubmit(data);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Preparar opciones de áreas para el select
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
    <DialogModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Editar Taladro' : 'Crear Nuevo Taladro'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Nombre del Taladro */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Taladro <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Ej: TAL-001"
            error={errors.name?.message}
            disabled={isSubmitting || isLoading}
          />
        </div>

        {/* Operador */}
        <div>
          <label htmlFor="operator" className="block text-sm font-medium text-gray-700 mb-1">
            Operador <span className="text-red-500">*</span>
          </label>
          <Input
            id="operator"
            {...register('operator')}
            placeholder="Ej: PDVSA, Chevron, Shell"
            error={errors.operator?.message}
            disabled={isSubmitting || isLoading}
          />
        </div>

        {/* Potencia */}
        <div>
          <label htmlFor="power" className="block text-sm font-medium text-gray-700 mb-1">
            Potencia <span className="text-red-500">*</span>
          </label>
          <Input
            id="power"
            {...register('power')}
            placeholder="Ej: 2000 HP, 1500 HP"
            error={errors.power?.message}
            disabled={isSubmitting || isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Especifica la potencia del taladro (HP, kW, etc.)
          </p>
        </div>

        {/* Área */}
        <div>
          <label htmlFor="areaId" className="block text-sm font-medium text-gray-700 mb-1">
            Área Geográfica
          </label>
          <Select
            id="areaId"
            {...register('areaId')}
            options={areaOptions}
            error={errors.areaId?.message}
            disabled={isSubmitting || isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Selecciona el área donde opera este taladro (opcional)
          </p>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting || isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </DialogModal>
  );
}
