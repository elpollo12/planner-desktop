import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileText, FileSpreadsheet, Files, TrendingUp,
  Droplets, Fuel, Container, Package, ClipboardSignature,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useModalStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { logisticsReportsApi, materialsApi } from '@/lib/api';
import { toast } from 'react-toastify';
import {
  detailedMovementReportSchema,
  detailedMaterialsReportSchema,
  detailedVacuumReportSchema,
  detailedRequestsReportSchema,
  type ReportFormat,
  type MovementFilter,
} from '@/schemas';
import {
  exportDetailedReportExcel,
  exportDetailedReportPdf,
} from '@/lib/logisticsExport';
import { capitalize } from '@/lib/stringUtils';
import { Button } from '@/components/ui';
import { REQUEST_STATUS_LABELS } from '@/types/logistics';
import type { Material, RequestStatus } from '@/types/logistics';

// ============================================================================
// Types & Constants
// ============================================================================

type Section = 'botellones' | 'combustible' | 'vacuum' | 'materiales' | 'solicitudes';

const SECTION_CARDS: {
  value: Section;
  label: string;
  description: string;
  icon: typeof Droplets;
  color: string;
  bg: string;
  ring: string;
}[] = [
  {
    value: 'botellones',
    label: 'Botellones de Agua',
    description: 'Entradas y salidas de botellones',
    icon: Droplets,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/15',
    ring: 'ring-blue-500',
  },
  {
    value: 'combustible',
    label: 'Combustible',
    description: 'Entradas y salidas de combustible',
    icon: Fuel,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/15',
    ring: 'ring-amber-500',
  },
  {
    value: 'vacuum',
    label: 'Vacuum / Cisterna',
    description: 'Registro de acciones realizadas',
    icon: Container,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/15',
    ring: 'ring-purple-500',
  },
  {
    value: 'materiales',
    label: 'Materiales',
    description: 'Movimientos por tipo de material',
    icon: Package,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-900/15',
    ring: 'ring-teal-500',
  },
  {
    value: 'solicitudes',
    label: 'Solicitudes',
    description: 'Detalle de solicitudes y estados',
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

const FORMAT_OPTIONS: { value: ReportFormat; label: string; icon: typeof FileSpreadsheet }[] = [
  { value: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'both', label: 'Ambos', icon: Files },
];

const MOVEMENT_FILTER_OPTIONS: { value: MovementFilter; label: string }[] = [
  { value: 'both', label: 'Todas' },
  { value: 'entries', label: 'Solo entradas' },
  { value: 'exits', label: 'Solo salidas' },
];

// ============================================================================
// Wizard Container
// ============================================================================

interface DetailedReportModalProps {
  rigId: string;
  /** Pre-selected section — if provided, step 1 starts with this selected */
  section?: Section;
  periodStart: string;
  periodEnd: string;
}

export function DetailedReportModal({
  rigId,
  section: initialSection,
  periodStart,
  periodEnd,
}: DetailedReportModalProps) {
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
            Reporte Detallado
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {step === 1
              ? 'Selecciona la sección que deseas exportar'
              : `${sectionCfg?.label} — Configurar exportación`}
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
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
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
                  {cfg.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {cfg.description}
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
          Cancelar
        </Button>
        <Button
          onClick={onNext}
          disabled={!selected}
          icon={<ChevronRight size={16} />}
          iconPosition="right"
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 2 — Configure & Export
// ============================================================================

function StepConfigureExport({
  section,
  periodStart,
  periodEnd,
  onBack,
}: {
  section: Section;
  periodStart: string;
  periodEnd: string;
  onBack: () => void;
}) {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const [materialsList, setMaterialsList] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Load materials when needed
  useEffect(() => {
    if (section === 'materiales' && sessionToken) {
      setLoadingMaterials(true);
      materialsApi
        .list(sessionToken, true)
        .then((mats) => setMaterialsList(mats))
        .catch((err) => console.error('Error loading materials:', err))
        .finally(() => setLoadingMaterials(false));
    }
  }, [section, sessionToken]);

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

      // Generate files
      if (data.format === 'excel' || data.format === 'both') {
        exportDetailedReportExcel(exportOpts);
      }
      if (data.format === 'pdf' || data.format === 'both') {
        exportDetailedReportPdf(exportOpts);
      }

      toast.success('Reporte detallado generado exitosamente');
      useModalStore.getState().closeModal();
    } catch (error: any) {
      console.error('Error generando reporte detallado:', error);
      toast.error(error?.toString() || 'Error al generar el reporte');
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
        {sectionCfg.label}
      </div>

      <div className="space-y-5 flex-1">
        {/* ── Fechas ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Desde <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('periodStart')}
              className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 ${
                errors.periodStart ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.periodStart && (
              <p className="mt-1 text-sm text-red-500">{(errors.periodStart as any).message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hasta <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('periodEnd')}
              className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 ${
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
        </div>

        {/* ── Filtro de movimientos (botellones, combustible, materiales) ── */}
        {(section === 'botellones' || section === 'combustible' || section === 'materiales') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de movimiento
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
                        {opt.label}
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
                Materiales
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('allMaterials')}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                Todos
              </label>
            </div>

            {!allMaterials && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
                {loadingMaterials ? (
                  <p className="text-sm text-gray-400 text-center py-2">Cargando materiales...</p>
                ) : materialsList.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">No hay materiales registrados</p>
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
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
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
                Estados a incluir
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('allStatuses')}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                Todos
              </label>
            </div>

            {!allStatuses && (
              <div className="space-y-1">
                {(Object.entries(REQUEST_STATUS_LABELS) as [RequestStatus, string][]).map(
                  ([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        {...register(`statuses.${key}`)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-orange-600 focus:ring-orange-500 accent-orange-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ),
                )}
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
          Atrás
        </Button>
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() => useModalStore.getState().closeModal()}
            variant="outline"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} icon={<TrendingUp size={16} />}>
            {isSubmitting
              ? 'Generando...'
              : `Generar ${selectedFormat === 'both' ? 'Reportes' : 'Reporte'}`}
          </Button>
        </div>
      </div>
    </form>
  );
}
