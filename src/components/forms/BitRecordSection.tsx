import { useFormContext, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button, Input, Select } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CompleteReportData } from '../../schemas';

export function BitRecordSection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CompleteReportData>();

  const { t } = useTranslation();

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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('reports.forms.bitRecord.title')}</h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addRecord}
          icon={<Plus size={16} />}
        >
          {t('reports.forms.bitRecord.addBit')}
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 mb-3">{t('reports.forms.bitRecord.noBits')}</p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={addRecord}
            icon={<Plus size={16} />}
          >
            {t('reports.forms.bitRecord.addFirstBit')}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('reports.forms.bitRecord.bitNumber', { number: index + 1 })}</h4>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => remove(index)}
                  icon={<Trash2 size={16} />}
                  className="text-red-600"
                >
                  {t('reports.forms.common.delete')}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Select
                  label={t('reports.forms.common.shift')}
                  {...register(`bitRecords.records.${index}.shift`)}
                  error={errors.bitRecords?.records?.[index]?.shift?.message}
                >
                  <option value="">{t('reports.forms.common.select')}</option>
                  <option value="morning">{t('reports.shiftLabels.morning')}</option>
                  <option value="afternoon">{t('reports.shiftLabels.afternoon')}</option>
                  <option value="night">{t('reports.shiftLabels.night')}</option>
                </Select>

                <Input
                  label={t('reports.forms.bitRecord.size')}
                  {...register(`bitRecords.records.${index}.size`)}
                  placeholder='Ej: 8 1/2"'
                />

                <Input
                  label={t('reports.forms.bitRecord.manufacturerCode')}
                  {...register(`bitRecords.records.${index}.manufacturerCode`)}
                />

                <Input
                  label={t('reports.forms.bitRecord.brand')}
                  {...register(`bitRecords.records.${index}.brand`)}
                  placeholder="Ej: Smith, Baker Hughes"
                />

                <Input
                  label={t('reports.forms.bitRecord.bitType')}
                  {...register(`bitRecords.records.${index}.bitType`)}
                  placeholder="Ej: Tricono, PDC"
                />

                <Input
                  label={t('reports.forms.bitRecord.serialNumber')}
                  {...register(`bitRecords.records.${index}.serialNumber`)}
                />

                <Input
                  label={t('reports.forms.bitRecord.jets')}
                  {...register(`bitRecords.records.${index}.jets`)}
                  placeholder="Ej: 13-13-13"
                />

                <Input
                  label={t('reports.forms.bitRecord.tfa')}
                  {...register(`bitRecords.records.${index}.tfa`)}
                />

                <Input
                  label={t('reports.forms.bitRecord.depthOut')}
                  {...register(`bitRecords.records.${index}.depthOut`)}
                />

                <Input
                  label={t('reports.forms.bitRecord.depthIn')}
                  {...register(`bitRecords.records.${index}.depthIn`)}
                />

                <Input
                  label={t('reports.forms.bitRecord.footage')}
                  {...register(`bitRecords.records.${index}.footage`)}
                />

                <Input
                  label={t('reports.forms.bitRecord.hoursTotal')}
                  type="number"
                  step="0.1"
                  {...register(`bitRecords.records.${index}.hoursTotal`, { valueAsNumber: true })}
                />

                <Input
                  label={t('reports.forms.bitRecord.dpTubos')}
                  {...register(`bitRecords.records.${index}.dpTubos`)}
                />

                <Input
                  label={t('reports.forms.bitRecord.kelly')}
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
