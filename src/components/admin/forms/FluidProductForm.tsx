import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { FluidProduct } from '@/types/fluid';

interface FluidProductFormData {
  code: string;
  name: string;
  ge?: number;
  package?: string;
  weightLbs?: number;
  volGal?: number;
  active?: boolean;
}

interface FluidProductFormProps {
  product?: FluidProduct;
  onSubmit: (data: FluidProductFormData) => Promise<void>;
  onCancel: () => void;
}

export default function FluidProductForm({ product, onSubmit, onCancel }: FluidProductFormProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState(product?.code ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [ge, setGe] = useState(product?.ge != null ? String(product.ge) : '');
  const [pkg, setPkg] = useState(product?.package ?? '');
  const [weightLbs, setWeightLbs] = useState(product?.weightLbs != null ? String(product.weightLbs) : '');
  const [volGal, setVolGal] = useState(product?.volGal != null ? String(product.volGal) : '');
  const [active, setActive] = useState(product?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!code.trim()) e.code = t('fluids.catalogForm.codeRequired');
    if (!name.trim()) e.name = t('fluids.catalogForm.nameRequired');
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        code: code.trim(),
        name: name.trim(),
        ge: ge ? Number(ge) : undefined,
        package: pkg.trim() || undefined,
        weightLbs: weightLbs ? Number(weightLbs) : undefined,
        volGal: volGal ? Number(volGal) : undefined,
        ...(product ? { active } : {}),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('fluids.catalogForm.code')} <span className="text-red-500">*</span>
          </label>
          <Input
            value={code}
            onChange={(e) => { setCode(e.target.value); setErrors((prev) => ({ ...prev, code: '' })); }}
            placeholder={t('fluids.catalogForm.codePlaceholder')}
            error={errors.code}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('fluids.catalogForm.name')} <span className="text-red-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: '' })); }}
            placeholder={t('fluids.catalogForm.namePlaceholder')}
            error={errors.name}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fluids.catalogForm.ge')}</label>
          <Input
            value={ge}
            onChange={(e) => setGe(e.target.value)}
            placeholder={t('fluids.catalogForm.gePlaceholder')}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fluids.catalogForm.package')}</label>
          <Input
            value={pkg}
            onChange={(e) => setPkg(e.target.value)}
            placeholder={t('fluids.catalogForm.packagePlaceholder')}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fluids.catalogForm.weight')}</label>
          <Input
            value={weightLbs}
            onChange={(e) => setWeightLbs(e.target.value)}
            placeholder="55"
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fluids.catalogForm.volume')}</label>
          <Input
            value={volGal}
            onChange={(e) => setVolGal(e.target.value)}
            placeholder="5"
            disabled={submitting}
          />
        </div>
      </div>

      {product && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('fluids.catalogForm.status')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {active ? t('fluids.catalogForm.visibleInReports') : t('fluids.catalogForm.hiddenInReports')}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={submitting}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-gray-600" />
          </label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          {t('fluids.catalogForm.cancel')}
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('fluids.catalogForm.saving') : product ? t('fluids.catalogForm.update') : t('fluids.catalogForm.create')}
        </Button>
      </div>
    </div>
  );
}
