import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Area, CreateAreaInput, UpdateAreaInput } from '@/types/rig';
import { createAreaSchema, updateAreaSchema } from '@/schemas';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { COMMON_COUNTRIES, VENEZUELA_STATES } from '@/types/rig';

interface AreaFormProps {
  onSubmit: (data: CreateAreaInput | UpdateAreaInput) => Promise<void>;
  area?: Area | null;
}

export default function AreaForm({ onSubmit, area }: AreaFormProps) {
  const isEditMode = !!area;
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CreateAreaInput | UpdateAreaInput>({
    resolver: zodResolver(isEditMode ? updateAreaSchema : createAreaSchema),
    defaultValues: area || {
      name: '',
      country: '',
      state: '',
    },
  });

  const selectedCountry = watch('country');

  const countryOptions = COMMON_COUNTRIES.map((country) => ({
    value: country,
    label: country,
  }));

  const getStateOptions = () => {
    if (selectedCountry === 'Venezuela') {
      return VENEZUELA_STATES.map((state) => ({
        value: state,
        label: state,
      }));
    }
    return [];
  };

  const stateOptions = getStateOptions();
  const showStateInput = selectedCountry && selectedCountry !== 'Venezuela';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre del Área <span className="text-red-500">*</span>
        </label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Ej: Zulia Norte, Oriente, Costa Afuera"
          error={errors.name?.message}
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-gray-500">
          Nombre descriptivo del área geográfica
        </p>
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
          País <span className="text-red-500">*</span>
        </label>
        <Select
          id="country"
          {...register('country')}
          options={countryOptions}
          error={errors.country?.message}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
          Estado/Provincia <span className="text-red-500">*</span>
        </label>
        
        {showStateInput ? (
          <Input
            id="state"
            {...register('state')}
            placeholder="Ej: Texas, Alberta, Neuquén"
            error={errors.state?.message}
            disabled={isSubmitting}
          />
        ) : selectedCountry === 'Venezuela' ? (
          <Select
            id="state"
            {...register('state')}
            options={stateOptions}
            error={errors.state?.message}
            disabled={isSubmitting}
          />
        ) : (
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

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}
