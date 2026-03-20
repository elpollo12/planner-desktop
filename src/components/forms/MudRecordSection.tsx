import { useFormContext, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button, Input, Select } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CompleteReportData } from '../../schemas';

export function MudRecordSection() {
  const { t } = useTranslation();
  const {
    register,
    control,
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('reports.forms.mud.title')}</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addMudRecord}
            icon={<Plus size={16} />}
          >
            {t('reports.forms.mud.addMeasurement')}
          </Button>
        </div>

        {mudFields.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-gray-500 mb-3">{t('reports.forms.mud.noMeasurements')}</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={addMudRecord}
              icon={<Plus size={16} />}
            >
              {t('reports.forms.mud.addFirstMeasurement')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {mudFields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('reports.forms.mud.measurementNumber', { number: index + 1 })}</h4>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeMud(index)}
                    icon={<Trash2 size={16} />}
                    className="text-red-600"
                  >
                    {t('reports.forms.common.delete')}
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <Select
                    label={t('reports.forms.common.shift')}
                    {...register(`mudRecords.records.${index}.shift`)}
                  >
                    <option value="">{t('reports.forms.common.select')}</option>
                    <option value="morning">{t('reports.shiftLabels.morning')}</option>
                    <option value="afternoon">{t('reports.shiftLabels.afternoon')}</option>
                    <option value="night">{t('reports.shiftLabels.night')}</option>
                  </Select>

                  <Input
                    label={t('reports.forms.mud.hour')}
                    type="time"
                    {...register(`mudRecords.records.${index}.hour`)}
                  />

                  <Input
                    label={t('reports.forms.mud.weight')}
                    {...register(`mudRecords.records.${index}.weight`)}
                    placeholder="9.5"
                  />

                  <Input
                    label={t('reports.forms.mud.viscosity')}
                    {...register(`mudRecords.records.${index}.viscosity`)}
                    placeholder="45"
                  />

                  <Input
                    label={t('reports.forms.mud.pvp')}
                    {...register(`mudRecords.records.${index}.pvp`)}
                    placeholder="12"
                  />

                  <Input
                    label={t('reports.forms.mud.gels')}
                    {...register(`mudRecords.records.${index}.gels`)}
                    placeholder="8/12"
                  />

                  <Input
                    label={t('reports.forms.mud.filtrate')}
                    {...register(`mudRecords.records.${index}.filtrate`)}
                    placeholder="7.5"
                  />

                  <Input
                    label={t('reports.forms.mud.ph')}
                    {...register(`mudRecords.records.${index}.ph`)}
                    placeholder="9.5"
                  />

                  <Input
                    label={t('reports.forms.mud.solids')}
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('reports.forms.mud.additivesTitle')}</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addAdditive}
            icon={<Plus size={16} />}
          >
            {t('reports.forms.mud.addAdditive')}
          </Button>
        </div>

        {additiveFields.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-gray-500 mb-3">{t('reports.forms.mud.noAdditives')}</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={addAdditive}
              icon={<Plus size={16} />}
            >
              {t('reports.forms.mud.addFirstAdditive')}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('reports.forms.common.shift')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('reports.forms.mud.additiveType')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('reports.forms.mud.quantity')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('reports.forms.common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {additiveFields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="px-4 py-3">
                      <Select
                        {...register(`mudRecords.additives.${index}.shift`)}
                        className="min-w-[150px]"
                      >
                        <option value="">{t('reports.forms.common.select')}</option>
                        <option value="morning">{t('reports.shiftLabels.morning')}</option>
                        <option value="afternoon">{t('reports.shiftLabels.afternoon')}</option>
                        <option value="night">{t('reports.shiftLabels.night')}</option>
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
