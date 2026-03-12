import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import LogoUploader from '@/components/ui/LogoUploader';
import type { Company, CreateCompanyInput, UpdateCompanyInput } from '@/types/company';

// ── Schema ────────────────────────────────────────────────────────────────────

const operatorSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(120, 'Máximo 120 caracteres')
    .trim(),
  active: z.boolean().optional(),
});

type OperatorFormValues = z.infer<typeof operatorSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

export interface OperatorFormProps {
  /** Present when editing; absent when creating */
  operator?: Company;
  logoDataUrl?: string | null;
  onSubmit: (data: CreateCompanyInput | UpdateCompanyInput) => Promise<void>;
  /** Recibe bytes ya procesados (puede incluir remoción de fondo via imgly) */
  onUploadLogo?: (bytes: Uint8Array, fileName: string) => Promise<void>;
  onRemoveLogo?: () => Promise<void>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OperatorForm({
  operator,
  logoDataUrl,
  onSubmit,
  onUploadLogo,
  onRemoveLogo,
}: OperatorFormProps) {
  const { t } = useTranslation();
  const isEditing = !!operator;
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null | undefined>(logoDataUrl);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OperatorFormValues>({
    resolver: zodResolver(operatorSchema),
    defaultValues: {
      name: operator?.name ?? '',
      active: operator?.active ?? true,
    },
  });

  const active = watch('active');

  const onValid = async (values: OperatorFormValues) => {
    if (isEditing) {
      await onSubmit({ name: values.name, active: values.active });
    } else {
      await onSubmit({ name: values.name, companyType: 'operator' });
    }
  };

  // ── Logo handlers ──────────────────────────────────────────────────────────

  const handleUpload = async (bytes: Uint8Array, fileName: string) => {
    if (!onUploadLogo) return;
    await onUploadLogo(bytes, fileName);
    // Actualizar preview local con el blob generado
    const blob = new Blob([bytes], { type: 'image/png' });
    setCurrentLogoUrl(URL.createObjectURL(blob));
  };

  const handleRemove = async () => {
    if (!onRemoveLogo) return;
    await onRemoveLogo();
    setCurrentLogoUrl(null);
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-5">

      {/* Nombre */}
      <div>
        <label htmlFor="op-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('admin.forms.nameLabel')} <span className="text-red-500">*</span>
        </label>
        <Input
          id="op-name"
          placeholder={t('admin.forms.operatorNamePlaceholder')}
          error={errors.name?.message}
          disabled={isSubmitting}
          {...register('name')}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('admin.forms.operatorNameHint')}
        </p>
      </div>

      {/* Logo — solo al editar */}
      {isEditing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('admin.forms.logo')}
          </label>
          <LogoUploader
            currentLogoUrl={currentLogoUrl}
            onUpload={onUploadLogo ? handleUpload : async () => {}}
            onRemove={onRemoveLogo ? handleRemove : undefined}
            disabled={isSubmitting || !onUploadLogo}
            previewSize={72}
            label={t('admin.forms.uploadLogo')}
            hint={t('admin.forms.logoHint')}
          />
        </div>
      )}

      {/* Placeholder logo para creación — icono informativo */}
      {!isEditing && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-dashed border-gray-300 dark:border-gray-600">
          <Building2 className="w-7 h-7 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('admin.forms.logoAfterCreate')}
          </p>
        </div>
      )}

      {/* Estado activo — solo al editar */}
      {isEditing && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('admin.forms.operatorStatus')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {active
                ? t('admin.forms.activeAvailable')
                : t('admin.forms.inactiveHidden')}
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
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {isEditing ? t('admin.forms.saveChanges') : t('admin.forms.createOperator')}
        </Button>
      </div>
    </form>
  );
}
