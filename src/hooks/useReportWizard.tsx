import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rigsApi, reportsApi } from '../lib/api';
import { buildFormFromSnapshot } from '../lib/reportHelpers';
import { toast } from '../lib/toast';
import { DEFAULT_REPORT_VALUES } from '../types/reportForm';
import type { WizardStep, TabId } from '../types/reportForm';
import type { CompleteReportData } from '../schemas';
import type { RigWithArea } from '../types/rig';
import type { Report } from '../types/report';
import type { UseFormReturn } from 'react-hook-form';

// ============================================================================
// TYPES
// ============================================================================

interface UseReportWizardOptions {
  methods: UseFormReturn<CompleteReportData>;
  sessionToken: string | null;
  user: { id: string; role: string } | null;
  existingReport: Report | null;
  isEditMode: boolean;
  /** Function to load an existing report (from useReportLoader) */
  loadReport: (reportId: string) => Promise<Partial<CompleteReportData> | null>;
  /** Modal opener from useModal store */
  openModal: (content: React.ReactNode, options?: Record<string, unknown>) => void;
  /** Route param id (for edit mode) */
  id?: string;
}

interface UseReportWizardReturn {
  // State
  wizardStep: WizardStep;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  accessibleRigs: RigWithArea[];
  selectedRigId: string;
  setSelectedRigId: (id: string) => void;
  isLoadingRigs: boolean;
  isLoadingSnapshot: boolean;

  // Computed
  isHeaderValid: boolean;
  canEdit: boolean;
  getSectionSummary: (tabId: TabId) => string;

  // Navigation handlers
  handleRigConfirmed: () => Promise<void>;
  handleBackToRig: () => void;
  handleContinueToSections: () => Promise<void>;
  handleBackToHeader: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useReportWizard({
  methods,
  sessionToken,
  user,
  existingReport,
  isEditMode,
  loadReport,
  openModal,
  id,
}: UseReportWizardOptions): UseReportWizardReturn {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────
  const [wizardStep, setWizardStep] = useState<WizardStep>('rig');
  const [activeTab, setActiveTab] = useState<TabId>('crew');
  const [accessibleRigs, setAccessibleRigs] = useState<RigWithArea[]>([]);
  const [selectedRigId, setSelectedRigId] = useState<string>('');
  const [isLoadingRigs, setIsLoadingRigs] = useState(false);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);

  const { trigger } = methods;
  const formData = methods.watch();
  const headerData = useMemo(() => formData.header, [formData.header]);

  // ── Computed values ─────────────────────────────────────────────────────

  const isHeaderValid = useMemo(() => {
    if (!headerData) return false;
    const hasReportNumber = !!(headerData.reportNumber && headerData.reportNumber > 0);
    const hasReportDate = !!headerData.reportDate;
    return hasReportNumber && hasReportDate;
  }, [headerData]);

  const canEdit = useMemo(() => {
    if (!existingReport || !user) return true;
    if (user.role === 'admin') return true;
    if (user.role === 'supervisor') {
      return existingReport.status === 'draft' || existingReport.status === 'rejected';
    }
    if (user.role === 'operator') {
      return (existingReport.status === 'draft' || existingReport.status === 'rejected' || existingReport.status === 'submitted') && existingReport.createdBy === user.id;
    }
    return false;
  }, [existingReport, user]);

  const getSectionSummary = useCallback(
    (tabId: TabId): string => {
      switch (tabId) {
        case 'crew': {
          const memberCount =
            formData.crew?.shifts?.reduce((sum, shift) => sum + shift.members.length, 0) || 0;
          return memberCount > 0 ? `${memberCount} miembros` : 'Sin datos';
        }
        case 'time': {
          const distCount = formData.timeDistribution?.distributions?.length || 0;
          return distCount > 0 ? `${distCount} operaciones` : 'Sin datos';
        }
        case 'bits': {
          const bitCount = formData.bitRecords?.records?.length || 0;
          return bitCount > 0 ? `${bitCount} mechas` : 'Sin datos';
        }
        case 'mud': {
          const mudCount = formData.mudRecords?.records?.length || 0;
          return mudCount > 0 ? `${mudCount} registros` : 'Sin datos';
        }
        case 'lithology': {
          const paramCount = formData.lithology?.drillingParameters?.length || 0;
          const devCount = formData.lithology?.deviationHistory?.length || 0;
          return paramCount > 0 || devCount > 0
            ? `${paramCount} parámetros, ${devCount} desviaciones`
            : 'Sin datos';
        }
        case 'observations': {
          const opsCount = formData.observations?.operations?.length || 0;
          return opsCount > 0 ? `${opsCount} observaciones` : 'Sin datos';
        }
        case 'drillString': {
          const compCount = formData.drillString?.components?.length || 0;
          return compCount > 0 ? `${compCount} piezas` : 'Sin datos';
        }
        default:
          return 'Sin datos';
      }
    },
    [formData],
  );

  // ── Effects ─────────────────────────────────────────────────────────────

  /** Load existing report or accessible rigs on mount */
  useEffect(() => {
    const loadData = async () => {
      if (isEditMode && id && sessionToken) {
        const data = await loadReport(id);
        if (data) {
          methods.reset(data);
          setWizardStep('sections');
        } else {
          navigate('/reports');
        }
      } else if (!isEditMode && sessionToken) {
        methods.reset(DEFAULT_REPORT_VALUES);
        setIsLoadingRigs(true);
        try {
          const rigs = await rigsApi.listAccessible(sessionToken, false);
          setAccessibleRigs(rigs);
          if (rigs.length === 1) {
            setSelectedRigId(rigs[0].id);
          }
        } catch (error) {
          console.error('[ReportForm] Failed to load rigs:', error);
          toast.error('Error al cargar taladros');
        } finally {
          setIsLoadingRigs(false);
        }
      }
    };

    loadData();
  }, [isEditMode, id, sessionToken]);

  /** Validate edit permissions */
  useEffect(() => {
    if (isEditMode && existingReport && !canEdit) {
      toast.error('No tienes permisos para editar este reporte');
      navigate('/reports');
    }
  }, [isEditMode, existingReport, canEdit, navigate]);

  // ── Navigation handlers ─────────────────────────────────────────────────

  const handleRigConfirmed = useCallback(async () => {
    if (!sessionToken || !selectedRigId) return;

    const rig = accessibleRigs.find((r) => r.id === selectedRigId);
    if (!rig) return;

    methods.setValue('header.rigNumber', rig.name);

    setIsLoadingSnapshot(true);
    try {
      const snapshot = await reportsApi.getLastSnapshot(sessionToken, rig.id);

      if (snapshot) {
        // Dynamic import to avoid pulling React component into this hook file
        const { default: SnapshotConfirmModal } = await import(
          '../components/modals/SnapshotConfirmModal'
        );

        openModal(
          <SnapshotConfirmModal
            rigName={rig.name}
            onConfirm={() => {
              const data = buildFormFromSnapshot(snapshot);
              methods.reset(data);
              toast.success('Datos del último reporte precargados');
              setWizardStep('header');
            }}
            onReject={() => {
              methods.setValue('header.rigNumber', rig.name);
              setWizardStep('header');
            }}
          />,
          {
            title: 'Datos disponibles',
            size: 'sm',
            showCloseButton: false,
            closeOnOutsideClick: false,
            closeOnEsc: false,
          },
        );
      } else {
        setWizardStep('header');
      }
    } catch (error) {
      console.warn('[ReportForm] Could not check snapshot:', error);
      setWizardStep('header');
    } finally {
      setIsLoadingSnapshot(false);
    }
  }, [sessionToken, selectedRigId, accessibleRigs, methods, openModal]);

  const handleBackToRig = useCallback(() => {
    methods.reset(DEFAULT_REPORT_VALUES);
    setWizardStep('rig');
  }, [methods]);

  const handleContinueToSections = useCallback(async () => {
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
  }, [trigger, isHeaderValid]);

  const handleBackToHeader = useCallback(() => {
    setWizardStep('header');
    toast.info('Ahora puedes modificar el encabezado');
  }, []);

  // ── Return ─────────────────────────────────────────────────────────────

  return {
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
  };
}
