
import { useState, useEffect, useCallback, useMemo } from 'react';
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
  ChevronRight,
  Edit2,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAutoSave } from '../hooks/useAutoSave';
import { completeReportSchema, type CompleteReportData } from '../schemas';
import {
  reportsApi,
  drillStringApi,
  crewApi,
  bitRecordsApi,
  timeDistributionApi,
  mudApi,
  drillingParamsApi,
  deviationApi,
  operationsLogApi,
} from '../lib/api';
import { transformFormToReportData } from '../lib/reportHelpers';
import { toast } from '../lib/toast';
import { loadLastReportTemplate, saveLastReportTemplate } from '../lib/lastReportData';
import type { Report } from '../types/report';

// Import form sections
import { HeaderSection } from '../components/forms/HeaderSection';
import { CrewSection } from '../components/forms/CrewSection';
import { TimeDistributionSection } from '../components/forms/TimeDistributionSection';
import { BitRecordSection } from '../components/forms/BitRecordSection';
import { MudRecordSection } from '../components/forms/MudRecordSection';
import { LithologySection } from '../components/forms/LithologySection';
import { ObservationsSection } from '../components/forms/ObservationsSection';

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'crew' | 'time' | 'bits' | 'mud' | 'lithology' | 'observations' | 'drillString';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  description: string;
}

type WizardStep = 'header' | 'sections';

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS: Tab[] = [
  {
    id: 'crew',
    label: 'Cuadrilla',
    icon: '👥',
    description: 'Personal y turnos de trabajo'
  },
  {
    id: 'time',
    label: 'Distribución de Tiempo',
    icon: '⏱️',
    description: 'Horas por operación y turno'
  },
  {
    id: 'bits',
    label: 'Mechas',
    icon: '🔩',
    description: 'Record de brocas utilizadas'
  },
  {
    id: 'mud',
    label: 'Lodo',
    icon: '🧪',
    description: 'Propiedades y aditivos del lodo'
  },
  {
    id: 'lithology',
    label: 'Litología',
    icon: '⛏️',
    description: 'Parámetros de perforación y desviación'
  },
  {
    id: 'observations',
    label: 'Observaciones',
    icon: '📝',
    description: 'Bitácora de operaciones'
  },
  {
    id: 'drillString',
    label: 'Sarta de Perforación',
    icon: '🔗',
    description: 'Datos de la sarta'
  },
];

const DEFAULT_VALUES: Partial<CompleteReportData> = {
  header: {
    reportNumber: 1,
    reportDate: new Date().toISOString().split('T')[0],
    wellNumber: '',
    rigNumber: '',
    operator: ''
  },
  crew: {
    shifts: [
      { shift: 'morning', shiftStart: '06:00', shiftEnd: '14:00', members: [] },
      { shift: 'afternoon', shiftStart: '14:00', shiftEnd: '22:00', members: [] },
      { shift: 'night', shiftStart: '22:00', shiftEnd: '06:00', members: [] },
    ],
  },
  timeDistribution: {
    distributions: [],
  },
  bitRecords: {
    records: [],
  },
  mudRecords: {
    records: [],
    additives: [],
  },
  lithology: {
    drillingParameters: [],
    deviationHistory: [],
  },
  observations: {
    operations: [],
  },
  drillString: {},
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ReportForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionToken, user } = useAuthStore();

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('header');
  const [activeTab, setActiveTab] = useState<TabId>('crew');

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Report state
  const [existingReport, setExistingReport] = useState<Report | null>(null);
  const [reportId, setReportId] = useState<string | null>(id || null);

  const isEditMode = !!id;

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
  const headerData = useMemo(() => formData.header, [formData.header]);
  // Auto-save hook (only for new reports in sections step)
  const autoSaveEnabled = useMemo(
    () => !isEditMode && isDirty && wizardStep === 'sections',
    [isEditMode, isDirty, wizardStep]
  );

  const {
    clearSaved: clearAutoSave,
  } = useAutoSave({
    data: formData,
    storageKey: 'report-draft',
    debounceMs: 2000,
    enabled: autoSaveEnabled,
  // DEBUG: Track renders
  });

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  /**
   * Check if header section is complete and valid
   */
  const isHeaderValid = useMemo(() => {
    if (!headerData) return false;

    // Required fields
    const hasReportNumber = headerData.reportNumber && headerData.reportNumber > 0;
    const hasReportDate = !!headerData.reportDate;

    return hasReportNumber && hasReportDate;
  }, [headerData]);

  /**
   * Check if user can edit this report
   */
  const canEdit = useMemo(() => {
    if (!existingReport || !user) return true;

    if (user.role === 'admin') return true;
    if (user.role === 'supervisor') return true;

    if (user.role === 'operator') {
      return existingReport.status === 'draft' && existingReport.createdBy === user.id;
    }

    return false;
  }, [existingReport, user]);

  /**
   * Get section data summary
   */
  const getSectionSummary = useCallback((tabId: TabId): string => {
    switch (tabId) {
      case 'crew':
        const memberCount = formData.crew?.shifts?.reduce(
          (sum, shift) => sum + shift.members.length, 0
        ) || 0;
        return memberCount > 0 ? `${memberCount} miembros` : 'Sin datos';

      case 'time':
        const distCount = formData.timeDistribution?.distributions?.length || 0;
        return distCount > 0 ? `${distCount} operaciones` : 'Sin datos';

      case 'bits':
        const bitCount = formData.bitRecords?.records?.length || 0;
        return bitCount > 0 ? `${bitCount} mechas` : 'Sin datos';

      case 'mud':
        const mudCount = formData.mudRecords?.records?.length || 0;
        return mudCount > 0 ? `${mudCount} registros` : 'Sin datos';

      case 'lithology':
        const paramCount = formData.lithology?.drillingParameters?.length || 0;
        const devCount = formData.lithology?.deviationHistory?.length || 0;
        return paramCount > 0 || devCount > 0
          ? `${paramCount} parámetros, ${devCount} desviaciones`
          : 'Sin datos';

      case 'observations':
        const opsCount = formData.observations?.operations?.length || 0;
        return opsCount > 0 ? `${opsCount} observaciones` : 'Sin datos';

      case 'drillString':
        const hasData = formData.drillString && Object.keys(formData.drillString).length > 0;
        return hasData ? 'Configurado' : 'Sin datos';

      default:
        return 'Sin datos';
    }
  }, [formData]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Load existing report OR restore draft
   */
  useEffect(() => {
    const loadData = async () => {
      if (isEditMode && id && sessionToken) {
        await loadExistingReport(id);
        setWizardStep('sections');
      } else if (!isEditMode && sessionToken && user) {
        const lastCompleteReport = await loadLastCompleteReport();
        
        if (lastCompleteReport) {
          methods.reset(lastCompleteReport);
                    toast.success('Datos del último reporte cargados (Reporte #' + (lastCompleteReport.header?.reportNumber || 'N/A') + ')');

        } else {
          const lastReportTemplate = loadLastReportTemplate();
          if (lastReportTemplate) {
            const newHeader = {
              ...DEFAULT_VALUES.header,
              ...lastReportTemplate,
              reportDate: new Date().toISOString().split('T')[0],
            };
            methods.reset({ ...DEFAULT_VALUES, header: newHeader });
            toast.info('Encabezado del último reporte cargado');
          }
        }
      }
    };

    loadData();
  }, [isEditMode, id, sessionToken, user]);

  /**
   * Validate edit permissions
   */
  useEffect(() => {
    if (isEditMode && existingReport && !canEdit) {
      toast.error('No tienes permisos para editar este reporte');
      navigate('/reports');
    }
  }, [isEditMode, existingReport, canEdit, navigate]);

  // ============================================================================
  // HANDLERS - WIZARD NAVIGATION
  // ============================================================================

  /**
   * Handle continue from header to sections
   */
  const handleContinueToSections = async () => {
    const isValid = await trigger('header');

    if (!isValid) {
      toast.error('Por favor completa todos los campos obligatorios del encabezado');
      return;
    }

    if (!isHeaderValid) {
      toast.error('Debes completar al menos el número y fecha del reporte');
      return;
    }

    setWizardStep('sections');
    toast.success('Encabezado completado. Ahora selecciona una sección para llenar.');
  };

  /**
   * Handle back to header editing
   */
  const handleBackToHeader = () => {
    setWizardStep('header');
    toast.info('Ahora puedes modificar el encabezado');
  };

  /**
   * Handle cancel - clean localStorage and navigate back
   */
  const handleCancel = () => {
    // Limpiar ambos localStorage
    clearAutoSave();
    localStorage.removeItem('report-header-draft');
    navigate('/reports');
  };

  // ============================================================================
  // HANDLERS - DATA LOADING
  // ============================================================================

  const loadExistingReport = async (reportId: string) => {
    if (!sessionToken) return;

    setIsLoadingReport(true);
    try {
      const report = await reportsApi.get(sessionToken, reportId);
      setExistingReport(report);

      const [
        drillString,
        crewShifts,
        bitRecords,
        timeDistributions,
        mudRecords,
        mudAdditives,
        drillingParams,
        deviationHistory,
        operationsLog,
      ] = await Promise.all([
        drillStringApi.get(sessionToken, reportId).catch(() => null),
        crewApi.listShifts(sessionToken, reportId).catch(() => []),
        bitRecordsApi.list(sessionToken, reportId).catch(() => []),
        timeDistributionApi.list(sessionToken, reportId).catch(() => []),
        mudApi.listRecords(sessionToken, reportId).catch(() => []),
        mudApi.listAdditives(sessionToken, reportId).catch(() => []),
        drillingParamsApi.list(sessionToken, reportId).catch(() => []),
        deviationApi.list(sessionToken, reportId).catch(() => []),
        operationsLogApi.list(sessionToken, reportId).catch(() => []),
      ]);

      const formData: Partial<CompleteReportData> = {
        header: {
          reportNumber: report.reportNumber,
          reportDate: report.reportDate,
          wellNumber: report.wellNumber ?? '',
          apiNumber: report.apiNumber ?? '',
          contract: report.contract ?? '',
          contractor: report.contractor ?? '',
          operator: report.operator ?? '',
          fieldDistrict: report.fieldDistrict ?? '',
          municipality: report.municipality ?? '',
          rigNumber: report.rigNumber ?? '',
          supervisor24h: report.supervisor24h ?? '',
        },
        drillString: drillString || {},
        crew: {
          shifts: crewShifts.length > 0 ? crewShifts : DEFAULT_VALUES.crew!.shifts,
        },
        bitRecords: {
          records: bitRecords,
        },
        timeDistribution: {
          distributions: (timeDistributions as any[]).map(td => ({
            operationCodeId: td.operationCodeId,
            hoursShift1: td.hoursShift1,
            hoursShift2: td.hoursShift2,
            hoursShift3: td.hoursShift3,
          })),
        },
        mudRecords: {
          records: (mudRecords as any[]) || [],
          additives: (mudAdditives as any[]) || [],
        },
        lithology: {
          drillingParameters: (drillingParams as any[]) || [],
          deviationHistory: (deviationHistory as any[]) || [],
        },
        observations: {
          operations: (operationsLog as any[]) || [],
        },
      };

      methods.reset(formData);

    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Error al cargar el reporte');
      navigate('/reports');
    } finally {
      setIsLoadingReport(false);
    }
  };

  /**
   * Load the last complete report from the current user
   * This will be used to pre-fill a new report with data from the last one
   */
  const loadLastCompleteReport = async (): Promise<Partial<CompleteReportData> | null> => {
    if (!sessionToken || !user) return null;

    try {
      // Get all reports from the current user
      const reports = await reportsApi.list(sessionToken, {
        dateFrom: undefined,
        dateTo: undefined,
        status: undefined,
        createdBy: user.id,
        wellNumber: undefined,
      });

      if (reports.length === 0) {
        return null;
      }

      // Sort by date descending and get the most recent one
      const sortedReports = [...reports].sort((a, b) => 
        new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
      );
      const lastReport = sortedReports[0];


      // Load all sections from the last report
      const [
        drillString,
        crewShifts,
        bitRecords,
        timeDistributions,
        mudRecords,
        mudAdditives,
        drillingParams,
        deviationHistory,
        operationsLog,
      ] = await Promise.all([
        drillStringApi.get(sessionToken, lastReport.id).catch(() => null),
        crewApi.listShifts(sessionToken, lastReport.id).catch(() => []),
        bitRecordsApi.list(sessionToken, lastReport.id).catch(() => []),
        timeDistributionApi.list(sessionToken, lastReport.id).catch(() => []),
        mudApi.listRecords(sessionToken, lastReport.id).catch(() => []),
        mudApi.listAdditives(sessionToken, lastReport.id).catch(() => []),
        drillingParamsApi.list(sessionToken, lastReport.id).catch(() => []),
        deviationApi.list(sessionToken, lastReport.id).catch(() => []),
        operationsLogApi.list(sessionToken, lastReport.id).catch(() => []),
      ]);

      // Build the complete form data with incremented report number and current date
      const formData: Partial<CompleteReportData> = {
        header: {
          reportNumber: lastReport.reportNumber + 1, // Increment report number
          reportDate: new Date().toISOString().split('T')[0], // Current date
          wellNumber: lastReport.wellNumber ?? '',
          apiNumber: lastReport.apiNumber ?? '',
          contract: lastReport.contract ?? '',
          contractor: lastReport.contractor ?? '',
          operator: lastReport.operator ?? '',
          fieldDistrict: lastReport.fieldDistrict ?? '',
          municipality: lastReport.municipality ?? '',
          rigNumber: lastReport.rigNumber ?? '',
          supervisor24h: lastReport.supervisor24h ?? '',
        },
        drillString: drillString || {},
        crew: {
          shifts: crewShifts.length > 0 ? crewShifts : DEFAULT_VALUES.crew!.shifts,
        },
        bitRecords: {
          records: bitRecords,
        },
        timeDistribution: {
          distributions: (timeDistributions as any[]).map(td => ({
            operationCodeId: td.operationCodeId,
            hoursShift1: td.hoursShift1,
            hoursShift2: td.hoursShift2,
            hoursShift3: td.hoursShift3,
          })),
        },
        mudRecords: {
          records: (mudRecords as any[]) || [],
          additives: (mudAdditives as any[]) || [],
        },
        lithology: {
          drillingParameters: (drillingParams as any[]) || [],
          deviationHistory: (deviationHistory as any[]) || [],
        },
        observations: {
          operations: (operationsLog as any[]) || [],
        },
      };

      return formData;

    } catch (error) {
      console.error('Error loading last complete report:', error);
      return null;
    }
  };

  // ============================================================================
  // HANDLERS - DATA SAVING (continuará en la siguiente parte...)
  // ============================================================================

  const handleSaveDraft = async () => {
    if (!sessionToken) {
      toast.error('No hay sesión activa');
      return;
    }

    if (!isHeaderValid) {
      toast.error('Completa el encabezado antes de guardar');
      return;
    }

    setIsSaving(true);
    try {
      let currentReportId = reportId;

      const reportData = transformFormToReportData(formData);

      if (currentReportId) {
        await reportsApi.update(sessionToken, currentReportId, reportData);
        toast.success('Reporte actualizado');
      } else {
        const newReport = await reportsApi.create(sessionToken, reportData);
        currentReportId = newReport.id;
        setReportId(currentReportId);

        // Guardar datos del reporte como plantilla para el próximo
        saveLastReportTemplate({
          reportNumber: formData.header.reportNumber,
          wellNumber: formData.header.wellNumber,
          apiNumber: formData.header.apiNumber,
          contract: formData.header.contract,
          contractor: formData.header.contractor,
          operator: formData.header.operator,
          fieldDistrict: formData.header.fieldDistrict,
          municipality: formData.header.municipality,
          rigNumber: formData.header.rigNumber,
          supervisor24h: formData.header.supervisor24h,
        });

        toast.success('Reporte guardado como borrador');
      }

      await saveAllSectionsWithData(currentReportId);

      clearAutoSave();

      navigate('/reports');

    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error(`Error al guardar: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data: CompleteReportData) => {
    if (!sessionToken) {
      toast.error('No hay sesión activa');
      return;
    }

    if (!isHeaderValid) {
      toast.error('Completa el encabezado antes de enviar');
      return;
    }

    setIsSubmitting(true);
    try {
      let currentReportId = reportId;

      const reportData = transformFormToReportData(data);

      if (currentReportId) {
        await reportsApi.update(sessionToken, currentReportId, reportData);
      } else {
        const newReport = await reportsApi.create(sessionToken, reportData);
        currentReportId = newReport.id;
        setReportId(currentReportId);

        // Guardar datos del reporte como plantilla para el próximo
        saveLastReportTemplate({
          reportNumber: data.header.reportNumber,
          wellNumber: data.header.wellNumber,
          apiNumber: data.header.apiNumber,
          contract: data.header.contract,
          contractor: data.header.contractor,
          operator: data.header.operator,
          fieldDistrict: data.header.fieldDistrict,
          municipality: data.header.municipality,
          rigNumber: data.header.rigNumber,
          supervisor24h: data.header.supervisor24h,
        });
      }

      await saveAllSectionsWithData(currentReportId);
      await reportsApi.submit(sessionToken, currentReportId);

      clearAutoSave();

      toast.success('Reporte enviado exitosamente');
      navigate('/reports');

    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error(`Error al enviar el reporte: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // HELPERS - SECTION SAVING (Individual functions)
  // ============================================================================

  /**
   * Check if a section has data
   */
  const hasSectionData = (sectionId: TabId): boolean => {
    switch (sectionId) {
      case 'drillString':
        return !!(formData.drillString && Object.keys(formData.drillString).length > 0);
      
      case 'crew':
        return !!(formData.crew?.shifts?.some(s => s.members.length > 0));
      
      case 'bits':
        return !!(formData.bitRecords?.records && formData.bitRecords.records.length > 0);
      
      case 'time':
        return !!(formData.timeDistribution?.distributions && formData.timeDistribution.distributions.length > 0);
      
      case 'mud':
        return !!(
          (formData.mudRecords?.records && formData.mudRecords.records.length > 0) ||
          (formData.mudRecords?.additives && formData.mudRecords.additives.length > 0)
        );
      
      case 'lithology':
        return !!(
          (formData.lithology?.drillingParameters && formData.lithology.drillingParameters.length > 0) ||
          (formData.lithology?.deviationHistory && formData.lithology.deviationHistory.length > 0)
        );
      
      case 'observations':
        return !!(formData.observations?.operations && formData.observations.operations.length > 0);
      
      default:
        return false;
    }
  };

  /**
   * Save DrillString section
   */
  const saveDrillString = async (reportId: string) => {
    if (!sessionToken || !formData.drillString) return;
    await drillStringApi.save(sessionToken, reportId, formData.drillString);
  };

  /**
   * Save Crew section
   * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
   */
  const saveCrew = async (reportId: string) => {
    if (!sessionToken) return;
    
    // PASO 1: Eliminar todos los shifts existentes (siempre en edit mode)
    if (isEditMode) {
      try {
        await crewApi.deleteAllShifts(sessionToken, reportId);
      } catch (error) {
        console.warn('Could not delete existing shifts:', error);
      }
    }
    
    // PASO 2: Insertar todos los shifts del formulario (solo si hay datos)
    if (formData.crew?.shifts) {
      for (const shift of formData.crew.shifts) {
        if (shift.members.length > 0) {
          await crewApi.createShift(sessionToken, reportId, shift);
        }
      }
    }
  };

  /**
   * Save Bit Records section
   * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
   */
  const saveBits = async (reportId: string) => {
    if (!sessionToken) return;
    
    // PASO 1: Eliminar todos los records existentes
    if (isEditMode) {
      try {
        await bitRecordsApi.deleteAll(sessionToken, reportId);
      } catch (error) {
        console.warn('Could not delete existing bit records:', error);
      }
    }
    
    // PASO 2: Insertar todos los records del formulario (solo si hay datos)
    if (formData.bitRecords?.records && formData.bitRecords.records.length > 0) {
      for (const record of formData.bitRecords.records) {
        await bitRecordsApi.create(sessionToken, reportId, record);
      }
    }
  };

  /**
   * Save Time Distribution section
   * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
   */
  const saveTime = async (reportId: string) => {
    if (!sessionToken) return;
    
    // PASO 1: Eliminar todos los distributions existentes (siempre en edit mode)
    if (isEditMode) {
      try {
        await timeDistributionApi.deleteAll(sessionToken, reportId);
      } catch (error) {
        console.warn('Could not delete existing time distributions:', error);
      }
    }
    
    // PASO 2: Insertar todos los distributions del formulario (solo si hay datos)
    if (formData.timeDistribution?.distributions && formData.timeDistribution.distributions.length > 0) {
      await timeDistributionApi.saveBulk(
        sessionToken,
        reportId,
        formData.timeDistribution.distributions
      );
    }
  };

  /**
   * Save Mud Records section
   * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
   */
  const saveMud = async (reportId: string) => {
    if (!sessionToken) return;
    
    // PASO 1: Eliminar todos los records y additives existentes (siempre en edit mode)
    if (isEditMode) {
      try {
        await mudApi.deleteAllRecords(sessionToken, reportId);
        await mudApi.deleteAllAdditives(sessionToken, reportId);
      } catch (error) {
        console.warn('Could not delete existing mud data:', error);
      }
    }
    
    // PASO 2: Insertar todos los records del formulario (solo si hay datos)
    if (formData.mudRecords?.records && formData.mudRecords.records.length > 0) {
      for (const record of formData.mudRecords.records) {
        await mudApi.createRecord(sessionToken, reportId, record);
      }
    }
    
    // PASO 3: Insertar todos los additives del formulario (solo si hay datos)
    if (formData.mudRecords?.additives && formData.mudRecords.additives.length > 0) {
      for (const additive of formData.mudRecords.additives) {
        await mudApi.createAdditive(sessionToken, reportId, additive);
      }
    }
  };

  /**
   * Save Lithology section
   * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
   */
  const saveLithology = async (reportId: string) => {
    if (!sessionToken) return;
    
    // PASO 1: Eliminar todos los params y deviations existentes (siempre en edit mode)
    if (isEditMode) {
      try {
        await drillingParamsApi.deleteAll(sessionToken, reportId);
        await deviationApi.deleteAll(sessionToken, reportId);
      } catch (error) {
        console.warn('Could not delete existing lithology data:', error);
      }
    }
    
    // PASO 2: Insertar todos los drilling parameters del formulario (solo si hay datos)
    if (formData.lithology?.drillingParameters && formData.lithology.drillingParameters.length > 0) {
      for (const param of formData.lithology.drillingParameters) {
        await drillingParamsApi.create(sessionToken, reportId, param);
      }
    }
    
    // PASO 3: Insertar todos los deviation history del formulario (solo si hay datos)
    if (formData.lithology?.deviationHistory && formData.lithology.deviationHistory.length > 0) {
      for (const deviation of formData.lithology.deviationHistory) {
        await deviationApi.create(sessionToken, reportId, deviation);
      }
    }
  };

  /**
   * Save Observations section
   * Strategy: DELETE ALL + INSERT ALL to avoid duplicates
   */
  const saveObservations = async (reportId: string) => {
    if (!sessionToken) return;
    
    // PASO 1: Eliminar todos los operations existentes (siempre en edit mode)
    if (isEditMode) {
      try {
        await operationsLogApi.deleteAll(sessionToken, reportId);
      } catch (error) {
        console.warn('Could not delete existing operations:', error);
      }
    }
    
    // PASO 2: Insertar todos los operations del formulario (solo si hay datos)
    if (formData.observations?.operations && formData.observations.operations.length > 0) {
      for (const operation of formData.observations.operations) {
        await operationsLogApi.create(sessionToken, reportId, operation);
      }
    }
  };

  /**
   * Save ALL sections that have data
   * This is the MAIN function to use instead of saveActiveSection
   */
    const saveAllSectionsWithData = async (reportId: string) => {
    if (!sessionToken) return;

    const sectionsToProcess: Array<{ id: TabId; name: string; saveFn: () => Promise<void>; hasData: boolean }> = [];

    // Detect which sections have data AND which are empty (for deletion in edit mode)
    sectionsToProcess.push({ 
      id: 'drillString', 
      name: 'Sarta de Perforación', 
      saveFn: () => saveDrillString(reportId),
      hasData: hasSectionData('drillString')
    });
    sectionsToProcess.push({ 
      id: 'crew', 
      name: 'Cuadrilla', 
      saveFn: () => saveCrew(reportId),
      hasData: hasSectionData('crew')
    });
    sectionsToProcess.push({ 
      id: 'bits', 
      name: 'Mechas', 
      saveFn: () => saveBits(reportId),
      hasData: hasSectionData('bits')
    });
    sectionsToProcess.push({ 
      id: 'time', 
      name: 'Distribución de Tiempo', 
      saveFn: () => saveTime(reportId),
      hasData: hasSectionData('time')
    });
    sectionsToProcess.push({ 
      id: 'mud', 
      name: 'Lodo', 
      saveFn: () => saveMud(reportId),
      hasData: hasSectionData('mud')
    });
    sectionsToProcess.push({ 
      id: 'lithology', 
      name: 'Litología', 
      saveFn: () => saveLithology(reportId),
      hasData: hasSectionData('lithology')
    });
    sectionsToProcess.push({ 
      id: 'observations', 
      name: 'Observaciones', 
      saveFn: () => saveObservations(reportId),
      hasData: hasSectionData('observations')
    });

    // Process all sections
    const errors: Array<{ section: string; error: any }> = [];
    let savedCount = 0;
    let deletedCount = 0;

    for (const section of sectionsToProcess) {
      try {
        if (section.hasData) {
          // Section has data: save it (will delete old + insert new)
          await section.saveFn();
          savedCount++;
        } else if (isEditMode) {
          // Section is empty in edit mode: just delete (cleanup)
          await section.saveFn(); // The saveFn already handles DELETE ALL
          deletedCount++;
        }
        // If new report and empty: do nothing (no data to save)
      } catch (error) {
        console.error(`✗ Error processing ${section.name}:`, error);
        errors.push({ section: section.name, error });
      }
    }

    // Report results
    if (errors.length === 0) {
      if (savedCount > 0 || deletedCount > 0) {
        const messages = [];
        if (savedCount > 0) messages.push(`${savedCount} guardada${savedCount > 1 ? 's' : ''}`);
        if (deletedCount > 0) messages.push(`${deletedCount} limpiada${deletedCount > 1 ? 's' : ''}`);
        toast.success(`Secciones: ${messages.join(', ')}`);
      }
    } else {
      toast.error(`Error al procesar ${errors.length} sección${errors.length > 1 ? 'es' : ''}`);
      throw new Error(`Failed to process sections: ${errors.map(e => e.section).join(', ')}`);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderTabContent = () => {
    switch (activeTab) {
      case 'crew':
        return <CrewSection />;
      case 'time':
        return <TimeDistributionSection />;
      case 'bits':
        return <BitRecordSection />;
      case 'mud':
        return <MudRecordSection />;
      case 'lithology':
        return <LithologySection />;
      case 'observations':
        return <ObservationsSection />;
      case 'drillString':
        return <div className="text-center py-8 text-gray-500">
          Sección de Sarta de Perforación (por implementar)
        </div>;
      default:
        return null;
    }
  };

  const renderHeaderSummary = () => {
    if (!headerData) return null;

    return (
      <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-blue-600" size={20} />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Encabezado Completado
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToHeader}
              icon={<Edit2 size={14} />}
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
            >
              Modificar
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Reporte #:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                {headerData.reportNumber}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Fecha:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                {new Date(headerData.reportDate).toLocaleDateString()}
              </span>
            </div>
            {headerData.wellNumber && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Pozo:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {headerData.wellNumber}
                </span>
              </div>
            )}
            {headerData.rigNumber && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">TAL:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {headerData.rigNumber}
                </span>
              </div>
            )}
            {headerData.supervisor24h && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Supervisor:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {headerData.supervisor24h}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

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
      <form onSubmit={hookFormSubmit(onSubmit)} onKeyDown={handleFormKeyDown}>
        <MainLayout
          title={isEditMode ? 'Editar Reporte DDR' : 'Nuevo Reporte DDR'}
          subtitle={
            isEditMode
              ? `Reporte #${existingReport?.reportNumber || id}`
              : wizardStep === 'header'
                ? 'Paso 1: Completa el encabezado del reporte'
                : 'Paso 2: Selecciona y llena una sección'
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
                    type="submit"
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

            {/* STEP 1: HEADER SECTION */}
            {wizardStep === 'header' && (
              <>
                <Card>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold">
                        1
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Información del Encabezado
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Completa los datos básicos del reporte
                        </p>
                      </div>
                    </div>

                    <HeaderSection />
                  </div>
                </Card>

                {/* Continue Button */}
                <Card>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {isHeaderValid
                            ? '✅ Encabezado completado. Puedes continuar.'
                            : '⚠️ Completa los campos obligatorios para continuar'
                          }
                        </p>
                        {errors.header && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                            Hay errores en el encabezado
                          </p>
                        )}
                      </div>
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleContinueToSections}
                        disabled={!isHeaderValid}
                        className='flex justify-center items-center'
                        icon={<ChevronRight size={20} />}
                        iconPosition='right'
                      >
                        Continuar
                      </Button>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* STEP 2: SECTIONS */}
            {wizardStep === 'sections' && (
              <>
                {/* Header Summary */}
                {renderHeaderSummary()}

                {/* Sections Data Summary */}
                {(() => {
                  const sectionsWithData = TABS.filter(tab => hasSectionData(tab.id));
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
                      {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const summary = getSectionSummary(tab.id);

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                              p-4 rounded-lg border-2 text-left transition-all
                              ${isActive
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
                                <p className={`text-xs font-medium ${summary !== 'Sin datos'
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-500 dark:text-gray-500'
                                  }`}>
                                  {summary}
                                </p>
                              </div>
                              {isActive && (
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
                      <span className="text-2xl">{TABS.find(t => t.id === activeTab)?.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {TABS.find(t => t.id === activeTab)?.label}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {TABS.find(t => t.id === activeTab)?.description}
                        </p>
                      </div>
                    </div>
                    <div>
                      Completacion
                    </div>
                  </div>
                  <div className="p-6">
                    {renderTabContent()}
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
                    type="submit"
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
