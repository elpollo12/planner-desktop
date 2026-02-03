import { useFormContext, useFieldArray } from 'react-hook-form';
import { Button, Input, Select } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CompleteReportData } from '../../schemas';
import { SHIFT_LABELS } from '../../types/report';

export function BitRecordSection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CompleteReportData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'bitRecords.records',
  });

  const addRecord = () => {
    append({
      shift: 'morning',
      size: '',
      manufacturerCode: '',
      brand: '',
      bitType: '',
      serialNumber: '',
      jets: '',
      tfa: '',
      depthOut: '',
      depthIn: '',
      footage: '',
      hoursTotal: 0,
      dpTubos: '',
      kelly: '',
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Record de Mechas</h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addRecord}
          icon={<Plus size={16} />}
        >
          Agregar Mecha
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-3">No hay mechas registradas</p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={addRecord}
            icon={<Plus size={16} />}
          >
            Agregar Primera Mecha
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900">Mecha #{index + 1}</h4>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Select
                  label="Turno"
                  {...register(`bitRecords.records.${index}.shift`)}
                  error={errors.bitRecords?.records?.[index]?.shift?.message}
                >
                  <option value="">Seleccionar...</option>
                  <option value="morning">{SHIFT_LABELS.morning}</option>
                  <option value="afternoon">{SHIFT_LABELS.afternoon}</option>
                  <option value="night">{SHIFT_LABELS.night}</option>
                </Select>

                <Input
                  label="Tamaño"
                  {...register(`bitRecords.records.${index}.size`)}
                  placeholder='Ej: 8 1/2"'
                />

                <Input
                  label="Código Fabricante"
                  {...register(`bitRecords.records.${index}.manufacturerCode`)}
                />

                <Input
                  label="Marca"
                  {...register(`bitRecords.records.${index}.brand`)}
                  placeholder="Ej: Smith, Baker Hughes"
                />

                <Input
                  label="Tipo de Mecha"
                  {...register(`bitRecords.records.${index}.bitType`)}
                  placeholder="Ej: Tricono, PDC"
                />

                <Input
                  label="Número de Serie"
                  {...register(`bitRecords.records.${index}.serialNumber`)}
                />

                <Input
                  label="Chorros"
                  {...register(`bitRecords.records.${index}.jets`)}
                  placeholder="Ej: 13-13-13"
                />

                <Input
                  label="TFA"
                  {...register(`bitRecords.records.${index}.tfa`)}
                />

                <Input
                  label="Prof. Sacada (ft)"
                  {...register(`bitRecords.records.${index}.depthOut`)}
                />

                <Input
                  label="Prof. Metida (ft)"
                  {...register(`bitRecords.records.${index}.depthIn`)}
                />

                <Input
                  label="Perf. Total (ft)"
                  {...register(`bitRecords.records.${index}.footage`)}
                />

                <Input
                  label="Horas Totales"
                  type="number"
                  step="0.1"
                  {...register(`bitRecords.records.${index}.hoursTotal`, { valueAsNumber: true })}
                />

                <Input
                  label="DP Tubos"
                  {...register(`bitRecords.records.${index}.dpTubos`)}
                />

                <Input
                  label="Kelly"
                  {...register(`bitRecords.records.${index}.kelly`)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
