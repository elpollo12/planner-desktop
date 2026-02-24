import { useFormContext, useFieldArray } from 'react-hook-form';
import { Button, Input } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CompleteReportData } from '../../schemas';
import { SHIFT_LABELS } from '../../types/report';

export function LithologySection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CompleteReportData>();

  const { fields: paramFields, append: appendParam, remove: removeParam } = useFieldArray({
    control,
    name: 'lithology.drillingParameters',
  });

  const { fields: deviationFields, append: appendDeviation, remove: removeDeviation } = useFieldArray({
    control,
    name: 'lithology.deviationHistory',
  });

  const addParameter = () => {
    appendParam({
      shift: undefined,
      depthFrom: '',
      depthTo: '',
      coreNumber: '',
      rotaryRpm: '',
      bitWeight: '',
      pumpPressure: '',
      pumpNumber: '',
      pumpLiner: '',
      pumpSpm: '',
      totalGpm: '',
      methodUsed: '',
      lithologyNotes: '',
    });
  };

  const addDeviation = () => {
    appendDeviation({
      depth: '',
      deviation: '',
      direction: '',
      tvo: '',
      horizontalDisplacement: '',
    });
  };

  return (
    <div className="p-6 space-y-8">
      {/* Parámetros de Perforación */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Parámetros de Perforación</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addParameter}
            icon={<Plus size={16} />}
          >
            Agregar Parámetro
          </Button>
        </div>

        {paramFields.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-gray-500 mb-3">No hay parámetros registrados</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={addParameter}
              icon={<Plus size={16} />}
            >
              Agregar Primer Parámetro
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {paramFields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Registro #{index + 1}</h4>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeParam(index)}
                    icon={<Trash2 size={16} />}
                    className="text-red-600"
                  >
                    Eliminar
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Turno
                    </label>
                    <select
                      {...register(`lithology.drillingParameters.${index}.shift`)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="morning">{SHIFT_LABELS.morning}</option>
                      <option value="afternoon">{SHIFT_LABELS.afternoon}</option>
                      <option value="night">{SHIFT_LABELS.night}</option>
                    </select>
                  </div>

                  <Input
                    label="Prof. Desde (ft)"
                    {...register(`lithology.drillingParameters.${index}.depthFrom`)}
                    placeholder="1000"
                  />

                  <Input
                    label="Prof. Hasta (ft)"
                    {...register(`lithology.drillingParameters.${index}.depthTo`)}
                    error={errors.lithology?.drillingParameters?.[index]?.depthTo?.message}
                    placeholder="1050"
                  />

                  <Input
                    label="Core #"
                    {...register(`lithology.drillingParameters.${index}.coreNumber`)}
                    placeholder="C-01"
                  />

                  <Input
                    label="RPM Rotaria"
                    {...register(`lithology.drillingParameters.${index}.rotaryRpm`)}
                    placeholder="120"
                  />

                  <Input
                    label="Peso Mecha (klb)"
                    {...register(`lithology.drillingParameters.${index}.bitWeight`)}
                    placeholder="25"
                  />

                  <Input
                    label="Presión Bomba (psi)"
                    {...register(`lithology.drillingParameters.${index}.pumpPressure`)}
                    placeholder="2500"
                  />

                  <Input
                    label="Bomba #"
                    {...register(`lithology.drillingParameters.${index}.pumpNumber`)}
                    placeholder="1"
                  />

                  <Input
                    label="Liner Bomba"
                    {...register(`lithology.drillingParameters.${index}.pumpLiner`)}
                    placeholder='6"'
                  />

                  <Input
                    label="SPM"
                    {...register(`lithology.drillingParameters.${index}.pumpSpm`)}
                    placeholder="80"
                  />

                  <Input
                    label="Total GPM"
                    {...register(`lithology.drillingParameters.${index}.totalGpm`)}
                    placeholder="450"
                  />

                  <Input
                    label="Método Usado"
                    {...register(`lithology.drillingParameters.${index}.methodUsed`)}
                    placeholder="Rotario, PDM, etc"
                    className="col-span-2"
                  />

                  <div className="col-span-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notas Litológicas
                    </label>
                    <textarea
                      {...register(`lithology.drillingParameters.${index}.lithologyNotes`)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Descripción de la formación, litología observada, etc."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de Desviación */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Historial de Desviación</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addDeviation}
            icon={<Plus size={16} />}
          >
            Agregar Medición
          </Button>
        </div>

        {deviationFields.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-gray-500 mb-3">No hay mediciones de desviación</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={addDeviation}
              icon={<Plus size={16} />}
            >
              Agregar Primera Medición
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Profundidad (ft)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Desviación (°)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Dirección (°)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    TVO (ft)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Desp. Horizontal (ft)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {deviationFields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="px-4 py-3">
                      <Input
                        {...register(`lithology.deviationHistory.${index}.depth`)}
                        placeholder="1000"
                        className="min-w-[100px]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        {...register(`lithology.deviationHistory.${index}.deviation`)}
                        placeholder="2.5"
                        className="min-w-[100px]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        {...register(`lithology.deviationHistory.${index}.direction`)}
                        placeholder="N45E"
                        className="min-w-[100px]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        {...register(`lithology.deviationHistory.${index}.tvo`)}
                        placeholder="998.5"
                        className="min-w-[100px]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        {...register(`lithology.deviationHistory.${index}.horizontalDisplacement`)}
                        placeholder="43.5"
                        className="min-w-[100px]"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => removeDeviation(index)}
                        icon={<Trash2 size={16} />}
                        className="text-red-600"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
