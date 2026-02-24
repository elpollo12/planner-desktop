import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAreaSchema } from '@/schemas';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { COMMON_COUNTRIES, VENEZUELA_STATES } from '@/types/rig';
import type { Area, CreateAreaInput } from '@/types/rig';

interface AreaFormProps {
  onSubmit: (data: CreateAreaInput) => Promise<void>;
  area?: Area | null;
}

export default function AreaForm({ onSubmit, area }: AreaFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<CreateAreaInput>({
    resolver: zodResolver(createAreaSchema),
    defaultValues: area || {
      name: '',
      country: '',
      state: '',
      active: true, 
    },
  });

  const selectedCountry = watch('country');
  const active = watch('active'); // Observar el valor de active

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
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
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <label htmlFor="active" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado del Área
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {active 
                ? 'El área está activa y disponible para asignación'
                : 'El área está inactiva y no aparecerá en las listas'}
            </p>
          </div>
          
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="active"
                checked={active}
                onChange={(e) => setValue('active', e.target.checked)}
                className="sr-only peer"
                disabled={isSubmitting}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-gray-50 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : area ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}