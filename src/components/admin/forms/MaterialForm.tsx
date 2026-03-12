import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Material } from '@/types/logistics';

interface MaterialFormProps {
  material?: Material;
  onSubmit: (data: { name: string; unit: string; description?: string; active?: boolean }) => Promise<void>;
  onCancel: () => void;
}

export default function MaterialForm({ material, onSubmit, onCancel }: MaterialFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(material?.name ?? '');
  const [unit, setUnit] = useState(material?.unit ?? '');
  const [description, setDescription] = useState(material?.description ?? '');
  const [active, setActive] = useState(material?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('admin.forms.nameRequired');
    if (!unit.trim()) e.unit = t('admin.forms.unitRequired');
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        unit: unit.trim(),
        description: description.trim() || undefined,
        ...(material ? { active } : {}),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('admin.forms.nameLabel')} <span className="text-red-500">*</span>
        </label>
        <Input
          value={name}
          onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
          placeholder={t('admin.forms.materialNamePlaceholder')}
          error={errors.name}
          disabled={submitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('admin.forms.materialUnitLabel')} <span className="text-red-500">*</span>
        </label>
        <Input
          value={unit}
          onChange={e => { setUnit(e.target.value); setErrors(prev => ({ ...prev, unit: '' })); }}
          placeholder={t('admin.forms.materialUnitPlaceholder')}
          error={errors.unit}
          disabled={submitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('admin.forms.materialDescOptional')}
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t('admin.forms.materialDescPlaceholder')}
          rows={3}
          disabled={submitting}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
        />
      </div>

      {material && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.forms.materialStatus')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {active ? t('admin.forms.materialActiveDesc') : t('admin.forms.materialInactiveDesc')}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              disabled={submitting}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-gray-600" />
          </label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          {t('admin.forms.cancel')}
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('admin.forms.saving') : material ? t('admin.forms.update') : t('admin.forms.create')}
        </Button>
      </div>
    </div>
  );
}
