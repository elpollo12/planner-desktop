import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FolderArchive, FileSpreadsheet, FileText, Files } from 'lucide-react';
import { useModalStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { logisticsReportsApi } from '@/lib/api';
import { toast } from 'react-toastify';
import { generalReportSchema, type GeneralReportForm, type ReportFormat } from '@/schemas';
import { saveGeneralReport } from '@/lib/logisticsExport';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { DEFAULT_APP_SETTINGS } from '@/types/appSettings';
import { Button } from '@/components/ui';

// ============================================================================
// Section config
// ============================================================================

const SECTION_OPTIONS: { key: keyof GeneralReportForm['sections']; label: string; color: string }[] = [
  { key: 'botellones', label: 'Botellones de Agua', color: 'accent-blue-600' },
  { key: 'combustible', label: 'Combustible', color: 'accent-amber-600' },
  { key: 'vacuum', label: 'Vacuum / Cisterna', color: 'accent-purple-600' },
  { key: 'materiales', label: 'Materiales', color: 'accent-teal-600' },
  { key: 'solicitudes', label: 'Solicitudes', color: 'accent-orange-600' },
];

const FORMAT_OPTIONS: { value: ReportFormat; label: string; icon: typeof FileSpreadsheet }[] = [
  { value: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'both', label: 'Ambos', icon: Files },
];

// ============================================================================
// Component
// ============================================================================

interface GeneralReportModalProps {
  rigId: string;
  rigName: string | null;
  periodStart: string;
  periodEnd: string;
}

export function GeneralReportModal({ rigId, rigName, periodStart, periodEnd }: GeneralReportModalProps) {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const user = useAuthStore((s) => s.user);
  const appSettings = useAppSettingsStore((s) => s.settings);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GeneralReportForm>({
    resolver: zodResolver(generalReportSchema),
    defaultValues: {
      format: 'pdf',
      periodStart,
      periodEnd,
      sections: {
        botellones: true,
        combustible: true,
        vacuum: true,
        materiales: true,
        solicitudes: true,
      },
    },
  });

  const selectedFormat = watch('format');

  const onFormSubmit = async (data: GeneralReportForm) => {
    if (!sessionToken) return;
    try {
      // 1. Fetch report data from API
      const report = await logisticsReportsApi.getReport(
        sessionToken,
        rigId,
        data.periodStart,
        data.periodEnd,
      );

      const opts = {
        report,
        sections: data.sections,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        branding: {
          logoBase64: appSettings?.logoPath ?? null,
          primaryColor: appSettings?.primaryColor ?? DEFAULT_APP_SETTINGS.primaryColor,
          rigName: rigName ?? '',
          userName: user?.fullName ?? '',
        },
      };

      // 2. Open native save dialog & write files
      const result = await saveGeneralReport(opts, data.format);

      // 3. If user cancelled the dialog, do nothing (keep modal open)
      if (!result.saved) return;

      // 4. Close & notify
      toast.success('Reporte general guardado exitosamente');
      useModalStore.getState().closeModal();
    } catch (error: any) {
      console.error('Error generando reporte general:', error);
      toast.error(error?.toString() || 'Error al generar el reporte');
    }
  };

  // Aggregate section error (from refine)
  const sectionsError = (errors as any)?.sections?.message || (errors as any)?.sections?.root?.message;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
          <FolderArchive className="text-indigo-600 dark:text-indigo-400" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reporte General</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Resumen de todas las secciones de logística
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
        {/* Fechas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Desde <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('periodStart')}
              className={`w-full px-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 ${
                errors.periodStart ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.periodStart && <p className="mt-1 text-sm text-red-500">{errors.periodStart.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hasta <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('periodEnd')}
              className={`w-full px-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 ${
                errors.periodEnd ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.periodEnd && <p className="mt-1 text-sm text-red-500">{errors.periodEnd.message}</p>}
          </div>
        </div>

        {/* Formato */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Formato <span className="text-red-500">*</span>
          </label>
          <Controller
            name="format"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-3 gap-2">
                {FORMAT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = field.value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        selected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 ring-2 ring-primary-500/20'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <Icon size={16} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.format && <p className="mt-1 text-sm text-red-500">{errors.format.message}</p>}
        </div>

        {/* Secciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Secciones a incluir
          </label>
          <div className="space-y-2">
            {SECTION_OPTIONS.map((sec) => (
              <label
                key={sec.key}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  {...register(`sections.${sec.key}`)}
                  className={`h-4 w-4 rounded border-gray-300 dark:border-gray-600 focus:ring-primary-500 ${sec.color}`}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{sec.label}</span>
              </label>
            ))}
          </div>
          {sectionsError && <p className="mt-1 text-sm text-red-500">{sectionsError}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={() => useModalStore.getState().closeModal()} variant="outline">
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} icon={<FolderArchive size={16} />}>
            {isSubmitting ? 'Generando...' : `Generar ${selectedFormat === 'both' ? 'Reportes' : 'Reporte'}`}
          </Button>
        </div>
      </form>
    </div>
  );
}
