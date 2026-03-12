import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileText, FileSpreadsheet, Files, TrendingUp,
  Droplets, Fuel, Container, Package, ClipboardSignature,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useModalStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { logisticsReportsApi } from '@/lib/api';
import { toast } from 'react-toastify';
import { useMaterialsCatalog } from '@/hooks/useLogistics';
import {
  detailedMovementReportSchema,
  detailedMaterialsReportSchema,
  detailedVacuumReportSchema,
  detailedRequestsReportSchema,
  type ReportFormat,
  type MovementFilter,
} from '@/schemas';
import {
  saveDetailedReport,
} from '@/lib/logisticsExport';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { DEFAULT_APP_SETTINGS } from '@/types/appSettings';
import { capitalize } from '@/lib/stringUtils';
import { Button } from '@/components/ui';
import { REQUEST_STATUSES } from '@/types/logistics';

// ============================================================================
// Types & Constants
// ============================================================================

type Section = 'botellones' | 'combustible' | 'vacuum' | 'materiales' | 'solicitudes';

const SECTION_CARDS: {
  value: Section;
  labelKey: string;
  descKey: string;
  icon: typeof Droplets;
  color: string;
  bg: string;
  ring: string;
}[] = [
  {
    value: 'botellones',
    labelKey: 'logistics.reports.labelBotellonesAgua',
    descKey: 'logistics.reports.descBotellones',
    icon: Droplets,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/15',
    ring: 'ring-blue-500',
  },
  {
    value: 'combustible',
    labelKey: 'logistics.reports.sectionCombustible',
    descKey: 'logistics.reports.descCombustible',
    icon: Fuel,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/15',
    ring: 'ring-amber-500',
  },
  {
    value: 'vacuum',
    labelKey: 'logistics.reports.sectionVacuum',
    descKey: 'logistics.reports.descVacuum',
    icon: Container,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/15',
    ring: 'ring-purple-500',
  },
  {
    value: 'materiales',
    labelKey: 'logistics.reports.sectionMateriales',
    descKey: 'logistics.reports.descMateriales',
    icon: Package,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-900/15',
    ring: 'ring-teal-500',
  },
  {
    value: 'solicitudes',
    labelKey: 'logistics.reports.sectionSolicitudes',
    descKey: 'logistics.reports.descSolicitudes',
    icon: ClipboardSignature,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/15',
    ring: 'ring-orange-500',
  },
];

const SECTION_API_MAP: Record<Section, string> = {
  botellones: 'water_bottles',
  combustible: 'fuel',
  vacuum: 'vacuum',
  materiales: 'materials',
  solicitudes: 'requests',
};

const FORMAT_OPTIONS: { value: ReportFormat; labelKey: string; icon: typeof FileSpreadsheet }[] = [
  { value: 'excel', labelKey: 'logistics.reports.formatExcel', icon: FileSpreadsheet },
  { value: 'pdf', labelKey: 'logistics.reports.formatPdf', icon: FileText },
  { value: 'both', labelKey: 'logistics.reports.formatBoth', icon: Files },
];

const MOVEMENT_FILTER_OPTIONS: { value: MovementFilter; labelKey: string }[] = [
  { value: 'both', labelKey: 'logistics.reports.allMovements' },
  { value: 'entries', labelKey: 'logistics.reports.onlyEntries' },
  { value: 'exits', labelKey: 'logistics.reports.onlyExits' },
];

// ============================================================================
// Wizard Container
// ============================================================================

interface DetailedReportModalProps {
  rigId: string;
  rigName: string | null;
  /** Pre-selected section — if provided, step 1 starts with this selected */
  section?: Section;
  periodStart: string;
  periodEnd: string;
}

export function DetailedReportModal({
  rigId,
  rigName,
  section: initialSection,
  periodStart,
  periodEnd,
}: DetailedReportModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedSection, setSelectedSection] = useState<Section | null>(
    initialSection ?? null,
  );

  const handleSelectSection = (section: Section) => {
    setSelectedSection(section);
  };

  const handleNext = () => {
    if (selectedSection) setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const sectionCfg = selectedSection
    ? SECTION_CARDS.find((s) => s.value === selectedSection)!
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
          <TrendingUp className="text-primary-600 dark:text-primary-400" size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('logistics.reports.detailedReport')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {step === 1
              ? t('logistics.reports.selectSectionToExport')
              : `${sectionCfg ? t(sectionCfg.labelKey) : ''} — ${t('logistics.reports.configureExport')}`}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-6 bg-primary-500'
                  : s < step
                    ? 'w-4 bg-primary-300 dark:bg-primary-700'
                    : 'w-4 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Step content ── */}
      {step === 1 ? (
        <StepSectionPicker
          selected={selectedSection}
          onSelect={handleSelectSection}
          onNext={handleNext}
        />
      ) : selectedSection ? (
        <StepConfigureExport
          rigId={rigId}
          rigName={rigName}
          section={selectedSection}
          periodStart={periodStart}
          periodEnd={periodEnd}
          onBack={handleBack}
        />
      ) : null}
    </div>
  );
}

// ============================================================================
// Step 1 — Section Picker
// ============================================================================

function StepSectionPicker({
  selected,
  onSelect,
  onNext,
}: {
  selected: Section | null;
  onSelect: (s: Section) => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col flex-1">
      <div className="grid grid-cols-1 gap-2.5 flex-1">
        {SECTION_CARDS.map((cfg) => {
          const Icon = cfg.icon;
          const isSelected = selected === cfg.value;
          return (
            <button
              key={cfg.value}
              type="button"
              onClick={() => onSelect(cfg.value)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all duration-150 cursor-pointer ${
                isSelected
                  ? `${cfg.bg} border-current ${cfg.color} ring-1 ${cfg.ring} shadow-sm`
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isSelected ? cfg.bg : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <Icon size={20} className={isSelected ? cfg.color : 'text-gray-400 dark:text-gray-500'} />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    isSelected ? cfg.color : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {t(cfg.labelKey)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t(cfg.descKey)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          onClick={() => useModalStore.getState().closeModal()}
          variant="outline"
        >
          {t('logistics.common.cancel')}
        </Button>
        <Button
          onClick={onNext}
          disabled={!selected}
          icon={<ChevronRight size={16} />}
          iconPosition="right"
        >
          {t('logistics.reports.next')}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 2 — Configure & Export
// ============================================================================

function StepConfigureExport({
  rigId,
  rigName,
  section,
  periodStart,
  periodEnd,
  onBack,
}: {
  rigId: string;
  rigName: string | null;
  section: Section;
  periodStart: string;
  periodEnd: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const user = useAuthStore((s) => s.user);
  const appSettings = useAppSettingsStore((s) => s.settings);
  const { data: materialsList = [], isLoading: loadingMaterials } = useMaterialsCatalog();

  // Pick the right schema
  const schema =
    section === 'materiales'
      ? detailedMaterialsReportSchema
      : section === 'vacuum'
        ? detailedVacuumReportSchema
        : section === 'solicitudes'
          ? detailedRequestsReportSchema
          : detailedMovementReportSchema;

  // Default values per section
  const getDefaults = (): any => {
    const base = { format: 'pdf' as ReportFormat, periodStart, periodEnd };
    if (section === 'materiales') {
      return { ...base, movementFilter: 'both' as MovementFilter, allMaterials: true, materialIds: [] };
    }
    if (section === 'vacuum') {
      return base;
    }
    if (section === 'solicitudes') {
      return {
        ...base,
        allStatuses: true,
        statuses: { requested: true, pending: true, approved: true, rejected: true },
      };
    }
    return { ...base, movementFilter: 'both' as MovementFilter };
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(),
  });

  const selectedFormat = watch('format');
  const allMaterials = watch('allMaterials');
  const allStatuses = watch('allStatuses');

  // ---- Submit handler ----
  const onFormSubmit = async (data: any) => {
    if (!sessionToken) return;
    try {
      const apiSection = SECTION_API_MAP[section];

      const detailedData = await logisticsReportsApi.getDetailedReport(
        sessionToken,
        rigId,
        apiSection,
        data.periodStart,
        data.periodEnd,
      );

      const exportOpts = {
        data: detailedData,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        movementFilter: data.movementFilter as MovementFilter | undefined,
        statusFilters: undefined as string[] | undefined,
        branding: {
          logoBase64: appSettings?.logoPath ?? null,
          primaryColor: appSettings?.primaryColor ?? DEFAULT_APP_SETTINGS.primaryColor,
          rigName: rigName ?? '',
          userName: user?.fullName ?? '',
        },
      };

      // Status filters for solicitudes
      if (section === 'solicitudes' && !data.allStatuses) {
        const statuses = data.statuses as Record<string, boolean>;
        exportOpts.statusFilters = Object.entries(statuses)
          .filter(([, v]) => v)
          .map(([k]) => k);
      }

      // Material filter — client-side
      if (section === 'materiales' && !data.allMaterials && data.materialIds?.length > 0) {
        const selectedIds = new Set(data.materialIds as string[]);
        if (detailedData.section === 'materials') {
          detailedData.movements = detailedData.movements.filter(
            (m) =>
              m.materialName &&
              selectedIds.has(
                materialsList.find((mat) => mat.name === m.materialName)?.id || '',
              ),
          );
        }
      }

      // Generate files via native save dialog
      const result = await saveDetailedReport(exportOpts, data.format);

      // If user cancelled the dialog, do nothing (keep modal open)
      if (!result.saved) return;

      toast.success(t('logistics.reports.detailedSaved'));
      useModalStore.getState().closeModal();
    } catch (error: any) {
      console.error('Error generando reporte detallado:', error);
      toast.error(error?.toString() || t('logistics.reports.generateError'));
    }
  };

  // Aggregate errors
  const materialIdsError = (errors as any)?.materialIds?.message;
  const statusesError =
    (errors as any)?.statuses?.message || (errors as any)?.statuses?.root?.message;

  const sectionCfg = SECTION_CARDS.find((s) => s.value === section)!;
  const SectionIcon = sectionCfg.icon;

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col flex-1">
      {/* Section badge */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium mb-4 self-start ${sectionCfg.bg} ${sectionCfg.color}`}
      >
        <SectionIcon size={14} />
        {t(sectionCfg.labelKey)}
      </div>

      <div className="space-y-5 flex-1">
        {/* ── Fechas ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('logistics.common.from')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('periodStart')}
              className={`w-full px-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 ${
                errors.periodStart ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.periodStart && (
              <p className="mt-1 text-sm text-red-500">{(errors.periodStart as any).message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('logistics.common.to')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('periodEnd')}
              className={`w-full px-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 ${
                errors.periodEnd ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.periodEnd && (
              <p className="mt-1 text-sm text-red-500">{(errors.periodEnd as any).message}</p>
            )}
          </div>
        </div>

        {/* ── Formato ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('logistics.common.format')} <span className="text-red-500">*</span>
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
                      {t(opt.labelKey)}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </div>

        {/* ── Filtro de movimientos (botellones, combustible, materiales) ── */}
        {(section === 'botellones' || section === 'combustible' || section === 'materiales') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('logistics.reports.movementType')}
            </label>
            <Controller
              name="movementFilter"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2">
                  {MOVEMENT_FILTER_OPTIONS.map((opt) => {
                    const selected = field.value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          selected
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 ring-2 ring-primary-500/20'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        {t(opt.labelKey)}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>
        )}

        {/* ── Selección de materiales ── */}
        {section === 'materiales' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('logistics.materials.title')}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('allMaterials')}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                {t('logistics.common.all')}
              </label>
            </div>

            {!allMaterials && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
                {loadingMaterials ? (
                  <p className="text-sm text-gray-400 text-center py-2">{t('logistics.materials.loadingMaterials')}</p>
                ) : materialsList.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">{t('logistics.materials.noRegistered')}</p>
                ) : (
                  <Controller
                    name="materialIds"
                    control={control}
                    render={({ field }) => (
                      <>
                        {materialsList.map((mat) => {
                          const checked = (field.value as string[]).includes(mat.id);
                          return (
                            <label
                              key={mat.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const current = field.value as string[];
                                  field.onChange(
                                    checked
                                      ? current.filter((id: string) => id !== mat.id)
                                      : [...current, mat.id],
                                  );
                                }}
                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500 accent-teal-600"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {capitalize(mat.name)}
                                <span className="text-gray-400 ml-1">({mat.unit})</span>
                              </span>
                            </label>
                          );
                        })}
                      </>
                    )}
                  />
                )}
              </div>
            )}
            {materialIdsError && (
              <p className="mt-1 text-sm text-red-500">{materialIdsError}</p>
            )}
          </div>
        )}

        {/* ── Filtro de estados (solicitudes) ── */}
        {section === 'solicitudes' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('logistics.reports.statusesToInclude')}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('allStatuses')}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                {t('logistics.common.all')}
              </label>
            </div>

            {!allStatuses && (
              <div className="space-y-1">
                {REQUEST_STATUSES.map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        {...register(`statuses.${key}`)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-orange-600 focus:ring-orange-500 accent-orange-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t(`logistics.requestStatusLabels.${key}`)}</span>
                    </label>
                  ))}
              </div>
            )}
            {statusesError && (
              <p className="mt-1 text-sm text-red-500">{statusesError}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex justify-between gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          onClick={onBack}
          variant="ghost"
          icon={<ChevronLeft size={16} />}
        >
          {t('logistics.reports.back')}
        </Button>
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() => useModalStore.getState().closeModal()}
            variant="outline"
          >
            {t('logistics.common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting} icon={<TrendingUp size={16} />}>
            {isSubmitting
              ? t('logistics.common.generating')
              : selectedFormat === 'both' ? t('logistics.common.generateReports') : t('logistics.common.generateReport')}
          </Button>
        </div>
      </div>
    </form>
  );
}
