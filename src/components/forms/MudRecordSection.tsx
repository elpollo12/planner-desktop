import { useFormContext, useFieldArray } from 'react-hook-form';
import { Button, Input, Select } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CompleteReportData } from '../../schemas';
import { SHIFT_LABELS } from '../../types/report';

export function MudRecordSection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CompleteReportData>();

  const { fields: mudFields, append: appendMud, remove: removeMud } = useFieldArray({
    control,
    name: 'mudRecords.records',
  });

  const { fields: additiveFields, append: appendAdditive, remove: removeAdditive } = useFieldArray({
    control,
    name: 'mudRecords.additives',
  });

  const addMudRecord = () => {
    appendMud({
      shift: undefined,
      hour: '',
      weight: '',
      viscosity: '',
      pvp: '',
      gels: '',
      filtrate: '',
      ph: '',
      solids: '',
    });
  };

  const addAdditive = () => {
    appendAdditive({
      shift: undefined,
      additiveType: '',
      quantity: '',
    });
  };

  return (
    <div className="p-6 space-y-8">
      {/* Propiedades del Lodo */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Propiedades del Lodo</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addMudRecord}
            icon={<Plus size={16} />}
          >
            Agregar Medición
          </Button>
        </div>

        {mudFields.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 mb-3">No hay mediciones registradas</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={addMudRecord}
              icon={<Plus size={16} />}
            >
              Agregar Primera Medición
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {mudFields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Medición #{index + 1}</h4>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeMud(index)}
                    icon={<Trash2 size={16} />}
                    className="text-red-600"
                  >
                    Eliminar
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <Select
                    label="Turno"
                    {...register(`mudRecords.records.${index}.shift`)}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="morning">{SHIFT_LABELS.morning}</option>
                    <option value="afternoon">{SHIFT_LABELS.afternoon}</option>
                    <option value="night">{SHIFT_LABELS.night}</option>
                  </Select>

                  <Input
                    label="Hora"
                    type="time"
                    {...register(`mudRecords.records.${index}.hour`)}
                  />

                  <Input
                    label="Peso (ppg)"
                    {...register(`mudRecords.records.${index}.weight`)}
                    placeholder="9.5"
                  />

                  <Input
                    label="Viscosidad (seg)"
                    {...register(`mudRecords.records.${index}.viscosity`)}
                    placeholder="45"
                  />

                  <Input
                    label="PVP (cps)"
                    {...register(`mudRecords.records.${index}.pvp`)}
                    placeholder="12"
                  />

                  <Input
                    label="Gels (10'/10\)"
                    {...register(`mudRecords.records.${index}.gels`)}
                    placeholder="8/12"
                  />

                  <Input
                    label="Filtrado (ml)"
                    {...register(`mudRecords.records.${index}.filtrate`)}
                    placeholder="7.5"
                  />

                  <Input
                    label="pH"
                    {...register(`mudRecords.records.${index}.ph`)}
                    placeholder="9.5"
                  />

                  <Input
                    label="Sólidos (%)"
                    {...register(`mudRecords.records.${index}.solids`)}
                    placeholder="8"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aditivos */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Aditivos y Químicos</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addAdditive}
            icon={<Plus size={16} />}
          >
            Agregar Aditivo
          </Button>
        </div>

        {additiveFields.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 mb-3">No hay aditivos registrados</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={addAdditive}
              icon={<Plus size={16} />}
            >
              Agregar Primer Aditivo
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Turno
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo de Aditivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {additiveFields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="px-4 py-3">
                      <Select
                        {...register(`mudRecords.additives.${index}.shift`)}
                        className="min-w-[150px]"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="morning">{SHIFT_LABELS.morning}</option>
                        <option value="afternoon">{SHIFT_LABELS.afternoon}</option>
                        <option value="night">{SHIFT_LABELS.night}</option>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        {...register(`mudRecords.additives.${index}.additiveType`)}
                        placeholder="Ej: Bentonita, Barita, CMC"
                        className="min-w-[200px]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        {...register(`mudRecords.additives.${index}.quantity`)}
                        placeholder="Ej: 50 kg, 100 lb"
                        className="min-w-[150px]"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => removeAdditive(index)}
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
