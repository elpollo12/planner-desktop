import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/';
import { toast } from '../lib/toast';
import { transformFormToReportData } from '../lib/reportHelpers';
import { loadLastReportTemplate, saveLastReportTemplate } from '../lib/lastReportData';
import { reportsApi } from '../lib/api';
import { type CompleteReportData } from '../schemas';
import { 
  loadReport, 
  loadLastCompleteReport, 
  saveAllSectionsWithData 
} from '../services/reportFormService';

interface UseReportPersistenceProps {
  isEditMode: boolean;
  formData: CompleteReportData;
  reportId: string | null;
  methods: any;
  setReportId: (id: string | null) => void;
  setExistingReport: (report: any) => void;
  setIsLoadingReport: (loading: boolean) => void;
}

interface UseReportPersistenceReturn {
  isLoading: boolean;
  loadExistingReport: (reportId: string) => Promise<void>;
  handleSaveDraft: () => Promise<void>;
  handleSubmitReport: (data: CompleteReportData) => Promise<void>;
}

/**
 * Hook para manejar la persistencia de datos (carga, guardado, envío)
 */
export function useReportPersistence({
  isEditMode,
  formData,
  reportId,
  methods,
  setReportId,
  setExistingReport,
  setIsLoadingReport,
}: UseReportPersistenceProps): UseReportPersistenceReturn {
  const navigate = useNavigate();
  const { sessionToken, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  // Cargar reporte existente
  const loadExistingReport = useCallback(async (reportIdToLoad: string) => {
    if (!sessionToken) return;

    setIsLoadingReport(true);
    try {
      const { report, formData: loadedFormData } = await loadReport(sessionToken, reportIdToLoad);
      
      setExistingReport(report);
      methods.reset(loadedFormData);
      
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Error al cargar el reporte');
      navigate('/reports');
    } finally {
      setIsLoadingReport(false);
    }
  }, [sessionToken, methods, setExistingReport, navigate, setIsLoadingReport]);

  // Cargar datos iniciales (al montar el componente)
  useEffect(() => {
    const loadInitialData = async () => {
      if (!sessionToken || !user) return;

      if (isEditMode && reportId) {
        await loadExistingReport(reportId);
      } else if (!isEditMode) {
        // Intentar cargar el último reporte completo del usuario
        const lastCompleteReport = await loadLastCompleteReport(sessionToken, user.id);
        
        if (lastCompleteReport) {
          methods.reset(lastCompleteReport);
          toast.success('Datos del último reporte cargados');
        } else {
          // Si no hay reporte completo, cargar plantilla del header
          const lastReportTemplate = loadLastReportTemplate();
          if (lastReportTemplate) {
            methods.reset({
              header: {
                ...lastReportTemplate,
                reportDate: new Date().toISOString().split('T')[0],
              },
            });
            toast.info('Encabezado del último reporte cargado');
          }
        }
      }
    };

    loadInitialData();
  }, [isEditMode, reportId, sessionToken, user, loadExistingReport, methods]);

  // Guardar como borrador
  const handleSaveDraft = useCallback(async () => {
    if (!sessionToken) {
      toast.error('No hay sesión activa');
      return;
    }

    if (!formData.header?.reportNumber || !formData.header?.reportDate) {
      toast.error('Completa el encabezado antes de guardar');
      return;
    }

    setIsLoading(true);
    try {
      let currentReportId = reportId;

      const reportData = transformFormToReportData(formData);

      if (currentReportId) {
        // Actualizar reporte existente
        await reportsApi.update(sessionToken, currentReportId, reportData);
        toast.success('Reporte actualizado');
      } else {
        // Crear nuevo reporte
        const newReport = await reportsApi.create(sessionToken, reportData);
        currentReportId = newReport.id;
        setReportId(currentReportId);

        // Guardar como plantilla para el próximo
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

      // Guardar todas las secciones
      await saveAllSectionsWithData(sessionToken, currentReportId, formData, isEditMode);

      navigate('/reports');

    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error(`Error al guardar: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, formData, reportId, setReportId, isEditMode, navigate]);

  // Enviar reporte
  const handleSubmitReport = useCallback(async (data: CompleteReportData) => {
    if (!sessionToken) {
      toast.error('No hay sesión activa');
      return;
    }

    if (!data.header?.reportNumber || !data.header?.reportDate) {
      toast.error('Completa el encabezado antes de enviar');
      return;
    }

    setIsLoading(true);
    try {
      let currentReportId = reportId;

      const reportData = transformFormToReportData(data);

      if (currentReportId) {
        await reportsApi.update(sessionToken, currentReportId, reportData);
      } else {
        const newReport = await reportsApi.create(sessionToken, reportData);
        currentReportId = newReport.id;
        setReportId(currentReportId);

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

      await saveAllSectionsWithData(sessionToken, currentReportId, data, isEditMode);
      await reportsApi.submit(sessionToken, currentReportId);

      toast.success('Reporte enviado exitosamente');
      navigate('/reports');

    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error(`Error al enviar el reporte: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, reportId, setReportId, isEditMode, navigate]);

  return {
    isLoading,
    loadExistingReport,
    handleSaveDraft,
    handleSubmitReport,
  };
}