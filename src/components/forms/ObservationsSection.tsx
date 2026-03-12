import { useFormContext, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CompleteReportData } from '../../schemas';

export function ObservationsSection() {
  const { t } = useTranslation();
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
            {t('reports.forms.observations.title')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('reports.forms.observations.subtitle')}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addOperation}
          icon={<Plus size={16} />}
        >
          {t('reports.forms.observations.addOperation')}
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 mb-3">{t('reports.forms.observations.noOperations')}</p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={addOperation}
            icon={<Plus size={16} />}
          >
            {t('reports.forms.observations.addFirstOperation')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('reports.forms.observations.operationNumber', { number: index + 1 })}</h4>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('reports.forms.common.shift')}
                  </label>
                  <select
                    {...register(`observations.operations.${index}.shift`)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                  >
                    <option value="">{t('reports.forms.common.select')}</option>
                    <option value="morning">{t('reports.shiftLabels.morning')}</option>
                    <option value="afternoon">{t('reports.shiftLabels.afternoon')}</option>
                    <option value="night">{t('reports.shiftLabels.night')}</option>
                  </select>
                </div>

                <Input
                  label={t('reports.forms.observations.timeFrom')}
                  type="time"
                  {...register(`observations.operations.${index}.timeFrom`)}
                />

                <Input
                  label={t('reports.forms.observations.timeTo')}
                  type="time"
                  {...register(`observations.operations.${index}.timeTo`)}
                />

                <Input
                  label={t('reports.forms.observations.duration')}
                  {...register(`observations.operations.${index}.duration`)}
                  placeholder="2.5 hrs"
                />

                <Input
                  label={t('reports.forms.observations.operationCode')}
                  {...register(`observations.operations.${index}.operationCode`)}
                  placeholder="Ej: DR, CI, RIH"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('reports.forms.observations.details')}
                </label>
                <textarea
                  {...register(`observations.operations.${index}.details`)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('reports.forms.observations.detailsPlaceholder')}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>{t('reports.forms.observations.codesLabel')}</strong> {t('reports.forms.observations.codesText')}
        </p>
      </div>
    </div>
  );
}
