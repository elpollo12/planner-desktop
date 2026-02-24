import { useFormContext, useFieldArray } from 'react-hook-form';
import { Button, Input } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CompleteReportData } from '../../schemas';
import { SHIFT_LABELS } from '../../types/report';

export function ObservationsSection() {
  const {
    register,
    control,
  } = useFormContext<CompleteReportData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'observations.operations',
  });

  const addOperation = () => {
    append({
      shift: undefined,
      timeFrom: '',
      timeTo: '',
      duration: '',
      operationCode: '',
      details: '',
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Log de Operaciones y Observaciones
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Registro cronológico de todas las actividades realizadas
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addOperation}
          icon={<Plus size={16} />}
        >
          Agregar Operación
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 mb-3">No hay operaciones registradas</p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={addOperation}
            icon={<Plus size={16} />}
          >
            Agregar Primera Operación
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Operación #{index + 1}</h4>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => remove(index)}
                  icon={<Trash2 size={16} />}
                  className="text-red-600"
                >
                  Eliminar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Turno
                  </label>
                  <select
                    {...register(`observations.operations.${index}.shift`)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="morning">{SHIFT_LABELS.morning}</option>
                    <option value="afternoon">{SHIFT_LABELS.afternoon}</option>
                    <option value="night">{SHIFT_LABELS.night}</option>
                  </select>
                </div>

                <Input
                  label="Hora Inicio"
                  type="time"
                  {...register(`observations.operations.${index}.timeFrom`)}
                />

                <Input
                  label="Hora Fin"
                  type="time"
                  {...register(`observations.operations.${index}.timeTo`)}
                />

                <Input
                  label="Duración"
                  {...register(`observations.operations.${index}.duration`)}
                  placeholder="2.5 hrs"
                />

                <Input
                  label="Código Op."
                  {...register(`observations.operations.${index}.operationCode`)}
                  placeholder="Ej: DR, CI, RIH"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Detalles de la Operación
                </label>
                <textarea
                  {...register(`observations.operations.${index}.details`)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Descripción detallada de la operación, observaciones, incidentes, etc."
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Códigos comunes:</strong> DR (Drilling/Perforando), CI (Circulate/Circulando), 
          RIH (Run In Hole), POOH (Pull Out of Hole), TD (Testing), WOC (Wait On Cement), 
          RM (Repair/Maintenance), etc.
        </p>
      </div>
    </div>
  );
}
