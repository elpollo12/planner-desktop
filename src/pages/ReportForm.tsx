
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MainLayout } from '../components/layout';
import { Button, Card } from '../components/ui';
import {
  Save,
  Send,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../store/modalStore';
import { useAutoSave } from '../hooks/useAutoSave';
import { useReportSave } from '../hooks/useReportSave';
import { useReportLoader } from '../hooks/useReportLoader';
import { useReportWizard } from '../hooks/useReportWizard';
import { completeReportSchema, type CompleteReportData } from '../schemas';
import { reportsApi } from '../lib/api';
import { transformFormToReportData } from '../lib/reportHelpers';
import { toast } from '../lib/toast';
import { backgroundPush } from '../lib/syncHelper';
import { WIZARD_TABS, DEFAULT_REPORT_VALUES } from '../types/reportForm';

// Import form sections & step components
import { RigSelectionStep } from '../components/forms/RigSelectionStep';
import { HeaderStep } from '../components/forms/HeaderStep';
import { HeaderSummaryCard } from '../components/forms/HeaderSummaryCard';
import { CrewSection } from '../components/forms/CrewSection';
import { TimeDistributionSection } from '../components/forms/TimeDistributionSection';
import { BitRecordSection } from '../components/forms/BitRecordSection';
import { MudRecordSection } from '../components/forms/MudRecordSection';
import { LithologySection } from '../components/forms/LithologySection';
import { DrillStringSection } from '../components/forms/DrillStringSection';
import { ObservationsSection } from '../components/forms/ObservationsSection';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ReportForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionToken, user } = useAuthStore();
  const { openModal } = useModal();

  // Loading states (kept here because they're used in handleSaveDraft/onSubmit)
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Report loader hook
  const { existingReport, isLoadingReport, failedSections, loadReport } = useReportLoader(sessionToken);

  // Report state
  const [reportId, setReportId] = useState<string | null>(id || null);

  const isEditMode = !!id;

  // React Hook Form setup
  const methods = useForm<CompleteReportData>({
    resolver: zodResolver(completeReportSchema),
    defaultValues: DEFAULT_REPORT_VALUES,
    mode: 'onChange',
  });

  const {
    formState: { errors, isDirty },
  } = methods;

  // Watch form data
  const formData = methods.watch();
  const headerData = formData.header;

  // Report section save hook
  const { saveAllSections, hasSectionData } = useReportSave({
    sessionToken,
    formData,
    failedSections,
  });

  // Wizard navigation hook
  const {
    wizardStep,
    activeTab,
    setActiveTab,
    accessibleRigs,
    selectedRigId,
    setSelectedRigId,
    isLoadingRigs,
    isLoadingSnapshot,
    isHeaderValid,
    canEdit,
    getSectionSummary,
    handleRigConfirmed,
    handleBackToRig,
    handleContinueToSections,
    handleBackToHeader,
  } = useReportWizard({
    methods,
    sessionToken,
    user,
    existingReport,
    isEditMode,
    loadReport,
    openModal,
    id,
  });

  // Auto-save hook (only for new reports in sections step)
  const { clearSaved: clearAutoSave } = useAutoSave({
    data: formData,
    storageKey: 'report-draft',
    debounceMs: 2000,
    enabled: !isEditMode && isDirty && wizardStep === 'sections',
  });

  // Cancel handler (needs clearAutoSave from above)
  const handleCancel = () => {
    clearAutoSave();
    navigate('/reports');
  };

  // ============================================================================
  // HANDLERS - DATA SAVING
  // ============================================================================

  /** Shared save logic: create/update report + save sections + snapshot + sync */
  const persistReport = async (
    data: CompleteReportData,
    opts: { submit?: boolean } = {},
  ): Promise<void> => {
    if (!sessionToken) {
      toast.error('No hay sesión activa');
      return;
    }
    if (!isHeaderValid) {
      toast.error('Completa el encabezado antes de guardar');
      return;
    }

    let currentReportId = reportId;
    const reportData = transformFormToReportData(data);

    // Create or update
    if (currentReportId) {
      await reportsApi.update(sessionToken, currentReportId, reportData);
      // If saving as draft and report was not already draft, reopen to draft
      if (!opts.submit && existingReport?.status && existingReport.status !== 'draft') {
        await reportsApi.reopen(sessionToken, currentReportId);
        // Refresh existingReport so subsequent saves don't try to reopen again
        await loadReport(currentReportId);
      }
      if (!opts.submit) toast.success('Reporte actualizado');
    } else {
      const newReport = await reportsApi.create(sessionToken, reportData);
      currentReportId = newReport.id;
      setReportId(currentReportId);
      if (!opts.submit) toast.success('Reporte guardado como borrador');
    }

    // Save all sections
    await saveAllSections(currentReportId);

    // Submit if requested
    if (opts.submit) {
      // If report is not already draft, reopen to draft first then submit
      if (existingReport?.status && existingReport.status !== 'draft') {
        await reportsApi.reopen(sessionToken, currentReportId);
      }
      await reportsApi.submit(sessionToken, currentReportId);
    }

    // Snapshot (non-blocking)
    await reportsApi.updateSnapshot(sessionToken, currentReportId).catch((err) =>
      console.warn('[ReportForm] Snapshot update failed (non-blocking):', err),
    );

    clearAutoSave();
    backgroundPush(sessionToken);

    if (opts.submit) toast.success('Reporte enviado exitosamente');
    navigate('/reports');
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await persistReport(formData);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error(`Error al guardar: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitReport = async () => {
    setIsSubmitting(true);
    try {
      await persistReport(formData, { submit: true });
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error(`Error al enviar el reporte: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Section tab → component mapping
  const TAB_COMPONENTS: Record<string, React.ReactNode> = {
    crew: <CrewSection />,
    time: <TimeDistributionSection />,
    bits: <BitRecordSection />,
    mud: <MudRecordSection />,
    lithology: <LithologySection />,
    observations: <ObservationsSection />,
    drillString: <DrillStringSection />,
  };

  // Current active tab metadata
  const currentTab = WIZARD_TABS.find(t => t.id === activeTab);

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      const target = e.target as HTMLInputElement;
      if (target.type !== 'submit' && target.type !== 'button') {
        e.preventDefault();
      }
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoadingReport) {
    return (
      <MainLayout title="Cargando reporte...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      </MainLayout>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={(e) => e.preventDefault()} onKeyDown={handleFormKeyDown}>
        <MainLayout
          title={isEditMode ? 'Editar Reporte DDR' : 'Nuevo Reporte DDR'}
          subtitle={
            isEditMode
              ? `Reporte #${existingReport?.reportNumber || id}`
              : wizardStep === 'rig'
                ? 'Paso 1: Selecciona el taladro'
                : wizardStep === 'header'
                  ? 'Paso 2: Completa el encabezado del reporte'
                  : 'Paso 3: Selecciona y llena una sección'
          }
          headerActions={
            <div className="flex gap-2 items-center flex-wrap">
              {wizardStep === 'sections' && (
                <>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={handleSaveDraft}
                    loading={isSaving}
                    disabled={!canEdit}
                    icon={<Save size={16} />}
                  >
                    Guardar Borrador
                  </Button>

                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleSubmitReport}
                    loading={isSubmitting}
                    disabled={!canEdit}
                    icon={<Send size={16} />}
                  >
                    Enviar Reporte
                  </Button>
                </>
              )}
            </div>
          }
        >
          <div className="max-w-7xl mx-auto space-y-6">

            {/* STEP 0: RIG SELECTION (new reports only) */}
            {wizardStep === 'rig' && !isEditMode && (
              <RigSelectionStep
                accessibleRigs={accessibleRigs}
                selectedRigId={selectedRigId}
                isLoadingRigs={isLoadingRigs}
                isLoadingSnapshot={isLoadingSnapshot}
                onSelectRig={setSelectedRigId}
                onConfirm={handleRigConfirmed}
                onCancel={handleCancel}
              />
            )}

            {/* STEP 1: HEADER SECTION */}
            {wizardStep === 'header' && (
              <HeaderStep
                isEditMode={isEditMode}
                isHeaderValid={isHeaderValid}
                errors={errors}
                onBack={handleBackToRig}
                onContinue={handleContinueToSections}
              />
            )}

            {/* STEP 3: SECTIONS */}
            {wizardStep === 'sections' && (
              <>
                {/* Header Summary */}
                {headerData && (
                  <HeaderSummaryCard
                    headerData={headerData}
                    onEdit={handleBackToHeader}
                  />
                )}

                {/* Sections Data Summary */}
                {(() => {
                  const sectionsWithData = WIZARD_TABS.filter(tab => hasSectionData(tab.id));
                  if (sectionsWithData.length > 0) {
                    return (
                      <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="text-green-600" size={20} />
                            <h3 className="font-semibold text-green-900 dark:text-green-100">
                              {sectionsWithData.length} Sección{sectionsWithData.length > 1 ? 'es' : ''} con Datos
                            </h3>
                          </div>
                          <p className="text-sm text-green-800 dark:text-green-200">
                            Al guardar, se registrarán: <strong>{sectionsWithData.map(t => t.label).join(', ')}</strong>
                          </p>
                        </div>
                      </Card>
                    );
                  }
                  return null;
                })()}

                {/* Section Selection */}
                <Card>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold">
                        2
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Selecciona una Sección
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Elige el tipo de reporte que deseas completar
                        </p>
                      </div>
                    </div>

                    {/* Tabs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {WIZARD_TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const isFailed = failedSections.has(tab.id);
                        const summary = isFailed ? '⚠ Error al cargar' : getSectionSummary(tab.id);

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                              p-4 rounded-lg border-2 text-left transition-all
                              ${isFailed
                                ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/10'
                                : isActive
                                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }
                            `}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{tab.icon}</span>
                              <div className="flex-1">
                                <h3 className={`font-semibold mb-1 ${isActive ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100'
                                  }`}>
                                  {tab.label}
                                </h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  {tab.description}
                                </p>
                                <p className={`text-xs font-medium ${isFailed
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : summary !== 'Sin datos'
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-gray-500 dark:text-gray-500'
                                  }`}>
                                  {summary}
                                </p>
                              </div>
                              {isActive && !isFailed && (
                                <CheckCircle2 className="text-primary-500 shrink-0" size={20} />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Card>

                {/* Active Section Content */}
                <Card>
                  <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{currentTab?.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {currentTab?.label}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {currentTab?.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    {TAB_COMPONENTS[activeTab] ?? null}
                  </div>
                  <div className='flex justify-end items-end'>
                  <Button
                    variant="danger"
                    size='lg'
                    type="button"
                    className='flex justify-center items-center'
                    onClick={handleCancel}
                    icon={<ChevronLeft size={20} />}
                  >
                    Cancelar
                  </Button>
                  </div>
                </Card>

                {/* Bottom Actions (Mobile) */}
                <div className="flex gap-3 justify-end lg:hidden pb-6">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={handleSaveDraft}
                    loading={isSaving}
                    disabled={!canEdit}
                    className="flex-1"
                  >
                    Guardar
                  </Button>
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleSubmitReport}
                    loading={isSubmitting}
                    disabled={!canEdit}
                    className="flex-1"
                  >
                    Enviar
                  </Button>
                </div>
              </>
            )}

          </div>
        </MainLayout>
      </form>
    </FormProvider>
  );
}
