import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CrewPosition } from '@/types/crewPosition';

interface CrewPositionFormProps {
  position?: CrewPosition;
  onSubmit: (data: { name: string; sortOrder?: number }) => Promise<void>;
  onCancel: () => void;
}

export default function CrewPositionForm({ position, onSubmit, onCancel }: CrewPositionFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(position?.name ?? '');
  const [sortOrder, setSortOrder] = useState(position?.sortOrder !== undefined ? String(position.sortOrder) : '');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('admin.forms.nameRequired');
    if (sortOrder !== '' && isNaN(parseInt(sortOrder))) e.sortOrder = t('admin.forms.mustBeInteger');
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const parsed = parseInt(sortOrder);
      await onSubmit({
        name: name.trim(),
        sortOrder: isNaN(parsed) ? undefined : parsed,
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
          placeholder={t('admin.forms.positionNamePlaceholder')}
          error={errors.name}
          disabled={submitting || position?.isDefault}
        />
        {position?.isDefault && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            {t('admin.forms.defaultCannotRename')}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('admin.forms.positionOrderOptional')}
        </label>
        <Input
          type="number"
          value={sortOrder}
          onChange={e => { setSortOrder(e.target.value); setErrors(prev => ({ ...prev, sortOrder: '' })); }}
          placeholder="0"
          error={errors.sortOrder}
          disabled={submitting}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('admin.forms.positionOrderHint')}
        </p>
      </div>

      {position?.isDefault && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t('admin.forms.defaultOnlyOrder')}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          {t('admin.forms.cancel')}
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('admin.forms.saving') : position ? t('admin.forms.update') : t('admin.forms.create')}
        </Button>
      </div>
    </div>
  );
}
