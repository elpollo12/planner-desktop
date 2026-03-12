import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, Trash2, HardHat } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Company, CreateCompanyInput, UpdateCompanyInput } from '@/types/company';

// ── Schema ────────────────────────────────────────────────────────────────────

const contractorSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(120, 'Máximo 120 caracteres')
    .trim(),
  active: z.boolean().optional(),
});

type ContractorFormValues = z.infer<typeof contractorSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ContractorFormProps {
  /** Present when editing; absent when creating */
  contractor?: Company;
  logoDataUrl?: string | null;
  onSubmit: (data: CreateCompanyInput | UpdateCompanyInput) => Promise<void>;
  onUploadLogo?: (file: File) => Promise<void>;
  onRemoveLogo?: () => Promise<void>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContractorForm({
  contractor,
  logoDataUrl,
  onSubmit,
  onUploadLogo,
  onRemoveLogo,
}: ContractorFormProps) {
  const { t } = useTranslation();
  const isEditing = !!contractor;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContractorFormValues>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      name: contractor?.name ?? '',
      active: contractor?.active ?? true,
    },
  });

  const active = watch('active');

  const onValid = async (values: ContractorFormValues) => {
    if (isEditing) {
      await onSubmit({ name: values.name, active: values.active });
    } else {
      await onSubmit({ name: values.name, companyType: 'contractor' });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadLogo) return;
    if (file.size > 2 * 1024 * 1024) return;
    setUploadingLogo(true);
    try {
      await onUploadLogo(file);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-5">

      {/* Nombre */}
      <div>
        <label htmlFor="ct-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('admin.forms.nameLabel')} <span className="text-red-500">*</span>
        </label>
        <Input
          id="ct-name"
          placeholder={t('admin.forms.contractorNamePlaceholder')}
          error={errors.name?.message}
          disabled={isSubmitting}
          {...register('name')}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('admin.forms.contractorNameHint')}
        </p>
      </div>

      {/* Logo — solo al editar */}
      {isEditing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('admin.forms.logo')}
          </label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700 overflow-hidden shrink-0">
              {logoDataUrl ? (
                <img src={logoDataUrl} alt={contractor!.name} className="w-full h-full object-contain" />
              ) : (
                <HardHat className="w-9 h-9 text-gray-400" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo || isSubmitting}
                icon={<Upload className="w-4 h-4" />}
              >
                {uploadingLogo ? t('admin.forms.uploading') : t('admin.forms.uploadLogo')}
              </Button>
              {logoDataUrl && onRemoveLogo && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={onRemoveLogo}
                  disabled={isSubmitting}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  {t('admin.forms.delete')}
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('admin.forms.logoHint')}
          </p>
        </div>
      )}

      {/* Estado activo — solo al editar */}
      {isEditing && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('admin.forms.contractorStatus')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {active
                ? t('admin.forms.activeAvailableMasc')
                : t('admin.forms.inactiveHiddenMasc')}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setValue('active', e.target.checked)}
              className="sr-only peer"
              disabled={isSubmitting}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {isEditing ? t('admin.forms.saveChanges') : t('admin.forms.createContractor')}
        </Button>
      </div>
    </form>
  );
}
