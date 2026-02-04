import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Area, CreateAreaInput, UpdateAreaInput } from '@/types/rig';
import { createAreaSchema, updateAreaSchema } from '@/schemas';
import { DialogModal } from '@/components/ui/DialogModal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { COMMON_COUNTRIES, VENEZUELA_STATES } from '@/types/rig';

interface AreaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAreaInput | UpdateAreaInput) => Promise<void>;
  area?: Area | null;
  isLoading?: boolean;
}

export default function AreaFormModal({
  isOpen,
  onClose,
  onSubmit,
  area,
  isLoading = false,
}: AreaFormModalProps) {
  const isEditMode = !!area;
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<CreateAreaInput | UpdateAreaInput>({
    resolver: zodResolver(isEditMode ? updateAreaSchema : createAreaSchema),
    defaultValues: {
      name: '',
      country: '',
      state: '',
    },
  });

  // Watch country to update state options
  const selectedCountry = watch('country');

  // Reset form when modal opens with area data
  useEffect(() => {
    if (isOpen) {
      if (area) {
        reset({
          name: area.name,
          country: area.country,
          state: area.state,
        });
      } else {
        reset({
          name: '',
          country: '',
          state: '',
        });
      }
    }
  }, [isOpen, area, reset]);

  const handleFormSubmit = async (data: CreateAreaInput | UpdateAreaInput) => {
    await onSubmit(data);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Preparar opciones de países
  const countryOptions = COMMON_COUNTRIES.map((country) => ({
    value: country,
    label: country,
  }));

  // Preparar opciones de estados según el país seleccionado
  const getStateOptions = () => {
    if (selectedCountry === 'Venezuela') {
      return VENEZUELA_STATES.map((state) => ({
        value: state,
        label: state,
      }));
    }
    // Para otros países, permitir entrada libre
    return [];
  };

  const stateOptions = getStateOptions();
  const showStateInput = selectedCountry && selectedCountry !== 'Venezuela';

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Editar Área' : 'Crear Nueva Área'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Nombre del Área */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Área <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Ej: Zulia Norte, Oriente, Costa Afuera"
            error={errors.name?.message}
            disabled={isSubmitting || isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Nombre descriptivo del área geográfica
          </p>
        </div>

        {/* País */}
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
            País <span className="text-red-500">*</span>
          </label>
          <Select
            id="country"
            {...register('country')}
            options={countryOptions}
            error={errors.country?.message}
            disabled={isSubmitting || isLoading}
          />
        </div>

        {/* Estado/Provincia */}
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
            Estado/Provincia <span className="text-red-500">*</span>
          </label>
          
          {showStateInput ? (
            // Input libre para países que no sean Venezuela
            <Input
              id="state"
              {...register('state')}
              placeholder="Ej: Texas, Alberta, Neuquén"
              error={errors.state?.message}
              disabled={isSubmitting || isLoading}
            />
          ) : selectedCountry === 'Venezuela' ? (
            // Select con estados de Venezuela
            <Select
              id="state"
              {...register('state')}
              options={stateOptions}
              error={errors.state?.message}
              disabled={isSubmitting || isLoading}
            />
          ) : (
            // Placeholder cuando no hay país seleccionado
            <Input
              id="state"
              {...register('state')}
              placeholder="Primero selecciona un país"
              error={errors.state?.message}
              disabled={true}
            />
          )}
          
          <p className="mt-1 text-xs text-gray-500">
            {selectedCountry === 'Venezuela' 
              ? 'Selecciona el estado venezolano' 
              : selectedCountry 
                ? 'Ingresa el estado o provincia' 
                : 'Primero selecciona un país'}
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
