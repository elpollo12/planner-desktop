import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MainLayout } from '../components/layout';
import { Button } from '../components/ui';
import { Save, Send } from 'lucide-react';

// Hooks
import { useReportForm } from '../hooks/useReportForm';
import { useReportPersistence } from '../hooks/useReportPersistence';
import { useSectionManager } from '../hooks/useSectionManager';
import { useFormValidation } from '../hooks/useFormValidation';

// Components
import {
  HeaderSummary,
  SectionDataSummary,
  SectionSelector,
  ActiveSectionContent,
  ReportFormHeader,
  ReportFormSection,
} from '../components/reportForm/components';

// Config and Types
import { completeReportSchema, type CompleteReportData } from '../schemas';
import { DEFAULT_VALUES, TABS } from '../components/reportForm/config/reportFormConfig';
import { TabId } from '@/types';

export default function ReportForm() {
  const navigate = useNavigate();

  // Hook para manejar el estado del formulario
  const { formState, isEditMode, user, actions } = useReportForm();

  // React Hook Form setup
  const methods = useForm<CompleteReportData>({
    resolver: zodResolver(completeReportSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  });

  const {
    handleSubmit: hookFormSubmit,
    formState: { errors, isDirty },
    watch,
    trigger,
  } = methods;

  // Watch form data
  const formData = watch();

  // Validación del formulario
  const { isHeaderValid, canEdit, getSectionSummary, getSectionsWithData } = useFormValidation({
    formData,
    existingReport: formState.report.existing,
  });

  // Gestión de persistencia
  const { isLoading, handleSaveDraft, handleSubmitReport } = useReportPersistence({
    isEditMode,
    formData,
    reportId: formState.report.id,
    methods,
    setReportId: actions.setReportId,
    setExistingReport: actions.setExistingReport,
    setIsLoadingReport: actions.setIsLoadingReport,
  });

  // Gestión de secciones
  const { 
    autoSaveEnabled, 
    hasSectionData, 
    handleContinueToSections, 
    handleBackToHeader, 
    handleCancel 
  } = useSectionManager({
    formData,
    isEditMode,
    wizardStep: formState.wizardStep,
    isDirty,
    trigger,
    isHeaderValid,
  });

  // Computed values
  const sectionsWithData = useMemo(() => 
    TABS.filter((tab: { id: any; }) => hasSectionData(tab.id)).map((tab: { id: any; }) => tab.id),
    [hasSectionData]
  );

  // Header actions for MainLayout
  const headerActions = useMemo(() => {
    if (formState.wizardStep !== 'sections') return null;

    return (
      <div className="flex gap-2 items-center flex-wrap">
        <Button
          variant="secondary"
          type="button"
          onClick={handleSaveDraft}
          loading={formState.loading.saving}
          disabled={!canEdit}
          icon={<Save size={16} />}
        >
          Guardar Borrador
        </Button>

        <Button
          variant="primary"
          type="submit"
          loading={formState.loading.submitting}
          disabled={!canEdit}
          icon={<Send size={16} />}
        >
          Enviar Reporte
        </Button>
      </div>
    );
  }, [formState.wizardStep, formState.loading, canEdit, handleSaveDraft]);

  // Handle form submission
  const onSubmit = async (data: CompleteReportData) => {
    await handleSubmitReport(data);
  };

  // Handle form key down
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      const target = e.target as HTMLInputElement;
      if (target.type !== 'submit' && target.type !== 'button') {
        e.preventDefault();
      }
    }
  };

  if (formState.loading.loadingReport) {
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
      <form onSubmit={hookFormSubmit(onSubmit)} onKeyDown={handleFormKeyDown}>
        <MainLayout
          title={isEditMode ? 'Editar Reporte DDR' : 'Nuevo Reporte DDR'}
          subtitle={
            isEditMode
              ? `Reporte #${formState.report.existing?.reportNumber || formState.report.id}`
              : formState.wizardStep === 'header'
                ? 'Paso 1: Completa el encabezado del reporte'
                : 'Paso 2: Selecciona y llena una sección'
          }
          headerActions={headerActions}
        >
          <div className="max-w-7xl mx-auto space-y-6">
            {/* STEP 1: HEADER SECTION */}
            {formState.wizardStep === 'header' && (
              <ReportFormHeader
                onContinue={() => {
                  handleContinueToSections();
                  actions.setWizardStep('sections');
                }}
                isValid={isHeaderValid}
                errors={errors}
              />
            )}

            {/* STEP 2: SECTIONS */}
            {formState.wizardStep === 'sections' && (
              <>
                {/* Header Summary */}
                <HeaderSummary
                  headerData={formData.header}
                  onEdit={() => {
                    handleBackToHeader();
                    actions.setWizardStep('header');
                  }}
                />

                {/* Sections Data Summary */}
                <SectionDataSummary sectionsWithData={sectionsWithData} />

                {/* Section Selection */}
                <SectionSelector
                  tabs={TABS}
                  activeTab={formState.activeTab}
                  onTabSelect={actions.setActiveTab}
                  getSectionSummary={getSectionSummary}
                  hasSectionData={hasSectionData}
                />

                {/* Active Section Content */}
                <ActiveSectionContent activeTab={formState.activeTab} />

                {/* Bottom Actions */}
                <ReportFormSection
                  onSave={handleSaveDraft}
                  onSubmit={() => hookFormSubmit(onSubmit)()}
                  onCancel={handleCancel}
                  isSaving={formState.loading.saving}
                  isSubmitting={formState.loading.submitting}
                  canEdit={canEdit} activeTab={'crew'} onTabChange={function (tab: TabId): void {
                    throw new Error('Function not implemented.');
                  } }                />
              </>
            )}
          </div>
        </MainLayout>
      </form>
    </FormProvider>
  );
}