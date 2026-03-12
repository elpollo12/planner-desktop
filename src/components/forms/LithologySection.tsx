import { useFormContext, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CompleteReportData } from '../../schemas';

export function LithologySection() {
  const { t } = useTranslation();

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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('reports.forms.lithology.title')}</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addParameter}
            icon={<Plus size={16} />}
          >
            {t('reports.forms.lithology.addParameter')}
          </Button>
        </div>

        {paramFields.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-gray-500 mb-3">{t('reports.forms.lithology.noParameters')}</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={addParameter}
              icon={<Plus size={16} />}
            >
              {t('reports.forms.lithology.addFirstParameter')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {paramFields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('reports.forms.lithology.recordNumber', { number: index + 1 })}</h4>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeParam(index)}
                    icon={<Trash2 size={16} />}
                    className="text-red-600"
                  >
                    {t('reports.forms.common.delete')}
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('reports.forms.common.shift')}
                    </label>
                    <select
                      {...register(`lithology.drillingParameters.${index}.shift`)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                    >
                      <option value="">{t('reports.forms.common.select')}</option>
                      <option value="morning">{t('reports.shiftLabels.morning')}</option>
                      <option value="afternoon">{t('reports.shiftLabels.afternoon')}</option>
                      <option value="night">{t('reports.shiftLabels.night')}</option>
                    </select>
                  </div>

                  <Input
                    label={t('reports.forms.lithology.depthFrom')}
                    {...register(`lithology.drillingParameters.${index}.depthFrom`)}
                    placeholder="1000"
                  />

                  <Input
                    label={t('reports.forms.lithology.depthTo')}
                    {...register(`lithology.drillingParameters.${index}.depthTo`)}
                    error={errors.lithology?.drillingParameters?.[index]?.depthTo?.message}
                    placeholder="1050"
                  />

                  <Input
                    label={t('reports.forms.lithology.coreNumber')}
                    {...register(`lithology.drillingParameters.${index}.coreNumber`)}
                    placeholder="C-01"
                  />

                  <Input
                    label={t('reports.forms.lithology.rotaryRpm')}
                    {...register(`lithology.drillingParameters.${index}.rotaryRpm`)}
                    placeholder="120"
                  />

                  <Input
                    label={t('reports.forms.lithology.bitWeight')}
                    {...register(`lithology.drillingParameters.${index}.bitWeight`)}
                    placeholder="25"
                  />

                  <Input
                    label={t('reports.forms.lithology.pumpPressure')}
                    {...register(`lithology.drillingParameters.${index}.pumpPressure`)}
                    placeholder="2500"
                  />

                  <Input
                    label={t('reports.forms.lithology.pumpNumber')}
                    {...register(`lithology.drillingParameters.${index}.pumpNumber`)}
                    placeholder="1"
                  />

                  <Input
                    label={t('reports.forms.lithology.pumpLiner')}
                    {...register(`lithology.drillingParameters.${index}.pumpLiner`)}
                    placeholder='6"'
                  />

                  <Input
                    label={t('reports.forms.lithology.spm')}
                    {...register(`lithology.drillingParameters.${index}.pumpSpm`)}
                    placeholder="80"
                  />

                  <Input
                    label={t('reports.forms.lithology.totalGpm')}
                    {...register(`lithology.drillingParameters.${index}.totalGpm`)}
                    placeholder="450"
                  />

                  <Input
                    label={t('reports.forms.lithology.methodUsed')}
                    {...register(`lithology.drillingParameters.${index}.methodUsed`)}
                    placeholder="Rotario, PDM, etc"
                    className="col-span-2"
                  />

                  <div className="col-span-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('reports.forms.lithology.lithologyNotes')}
                    </label>
                    <textarea
                      {...register(`lithology.drillingParameters.${index}.lithologyNotes`)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500"
                      placeholder={t('reports.forms.lithology.lithologyNotesPlaceholder')}
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('reports.forms.lithology.deviationTitle')}</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addDeviation}
            icon={<Plus size={16} />}
          >
            {t('reports.forms.lithology.addDeviation')}
          </Button>
        </div>

        {deviationFields.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-gray-500 mb-3">{t('reports.forms.lithology.noDeviations')}</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={addDeviation}
              icon={<Plus size={16} />}
            >
              {t('reports.forms.lithology.addFirstDeviation')}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('reports.forms.lithology.depthFt')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('reports.forms.lithology.deviationDeg')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('reports.forms.lithology.directionDeg')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('reports.forms.lithology.tvoFt')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('reports.forms.lithology.horizontalDisplacement')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('reports.forms.common.actions')}
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
