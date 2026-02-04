import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MainLayout } from '../components/layout';
import { Button, Card, AutoSaveIndicator } from '../components/ui';
import { Save, Send, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAutoSave } from '../hooks/useAutoSave';
import { completeReportSchema, type CompleteReportData } from '../schemas';
import {
  reportsApi,
  drillStringApi,
  crewApi,
  bitRecordsApi
} from '../lib/api';
import { transformFormToReportData, transformReportToForm } from '../lib/reportHelpers';

// Import form sections
import { HeaderSection } from '../components/forms/HeaderSection';
import { CrewSection } from '../components/forms/CrewSection';
import { TimeDistributionSection } from '../components/forms/TimeDistributionSection';
import { BitRecordSection } from '../components/forms/BitRecordSection';
import { MudRecordSection } from '../components/forms/MudRecordSection';
import { LithologySection } from '../components/forms/LithologySection';
import { ObservationsSection } from '../components/forms/ObservationsSection';

type TabId = 'header' | 'crew' | 'time' | 'bits' | 'mud' | 'lithology' | 'observations';

interface Tab {
  id: TabId;
  label: string;
  icon?: string;
}

const defaultValues: Partial<CompleteReportData> = {
  header: {
    reportNumber: 1,
    reportDate: new Date().toISOString().split('T')[0],
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

export default function ReportForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('header');
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = !!id;

  // React Hook Form setup
  const methods = useForm<CompleteReportData>({
    resolver: zodResolver(completeReportSchema),
    defaultValues,
    mode: 'onChange', // Validate on change
  });

  const {
    handleSubmit: hookFormSubmit,
    formState: { errors, isDirty, isValid },
    watch,
  } = methods;

  const tabs: Tab[] = [
    { id: 'header', label: 'Encabezado', icon: '📋' },
    { id: 'crew', label: 'Cuadrilla', icon: '👥' },
    { id: 'time', label: 'Distribución de Tiempo', icon: '⏱️' },
    { id: 'bits', label: 'Mechas', icon: '🔩' },
    { id: 'mud', label: 'Lodo', icon: '🧪' },
    { id: 'lithology', label: 'Litología', icon: '⛏️' },
    { id: 'observations', label: 'Observaciones', icon: '📝' },
  ];

  // Watch all form data for auto-save
  const formData = watch();

  // Auto-save hook (only for new reports, not when editing)
  const {
    status: autoSaveStatus,
    lastSaved,
    clearSaved: clearAutoSave,
    loadFromStorage,
  } = useAutoSave({
    data: formData,
    storageKey: 'report-draft',
    debounceMs: 2000,
    enabled: !isEditMode && isDirty,
    onSave: () => console.log('Auto-saved to localStorage'),
  });

  // Load draft on mount OR load existing report if editing
  useEffect(() => {
    const loadData = async () => {
      if (isEditMode && id && sessionToken) {
        try {
          const report = await reportsApi.get(sessionToken, id);
          const loadedFormData = transformReportToForm(report);
          methods.reset(loadedFormData);
          console.log('Report loaded for editing:', report);
        } catch (error) {
          console.error('Error loading report:', error);
          alert('Error al cargar el reporte');
        }
      } else if (!isEditMode) {
        // Use the hook's loadFromStorage function
        const savedDraft = loadFromStorage();
        if (savedDraft) {
          methods.reset(savedDraft);
          console.log('Draft loaded from localStorage');
        }
      }
    };

    loadData();
  }, [isEditMode, id, sessionToken, methods, loadFromStorage]);

  const handleSaveDraft = async () => {
    if (!sessionToken) {
      console.error('No session token available');
      return;
    }

    setIsSaving(true);
    try {
      const formData = watch();
      const reportData = transformFormToReportData(formData);

      const report = await reportsApi.create(sessionToken, reportData);
      console.log('Draft saved successfully:', report);

      clearAutoSave();
      alert('Borrador guardado exitosamente');
      
      // Navigate to edit mode with the created report ID
      navigate(`/reports/edit/${report.id}`);
      
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Error al guardar el borrador: ' + error);
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data: CompleteReportData) => {
    if (!sessionToken) {
      console.error('No session token available');
      return;
    }

    try {
      let reportId: string;

      if (isEditMode && id) {
        // Update existing report
        const reportData = transformFormToReportData(data);
        const report = await reportsApi.update(sessionToken, id, reportData);
        reportId = report.id;
        console.log('Report updated:', report);
      } else {
        // Create new report
        const reportData = transformFormToReportData(data);
        const report = await reportsApi.create(sessionToken, reportData);
        reportId = report.id;
        console.log('Report created:', report);
      }

      // Save drill string if provided
      if (data.drillString && Object.keys(data.drillString).length > 0) {
        await drillStringApi.save(sessionToken, reportId, data.drillString);
        console.log('Drill string saved');
      }

      // Save crew shifts
      if (data.crew?.shifts) {
        for (const shift of data.crew.shifts) {
          if (shift.members.length > 0) {
            await crewApi.createShift(sessionToken, reportId, shift);
          }
        }
        console.log('Crew shifts saved');
      }

      // Save bit records
      if (data.bitRecords?.records && data.bitRecords.records.length > 0) {
        for (const record of data.bitRecords.records) {
          await bitRecordsApi.create(sessionToken, reportId, record);
        }
        console.log('Bit records saved');
      }

      // Submit report (change status to 'submitted')
      await reportsApi.submit(sessionToken, reportId);
      console.log('Report submitted');

      clearAutoSave();
      alert('Reporte enviado exitosamente');
      navigate('/reports');
      
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error al enviar el reporte: ' + error);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'header':
        return <HeaderSection />;
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
      default:
        return null;
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={hookFormSubmit(onSubmit)}>
        <MainLayout
          title={isEditMode ? 'Editar Reporte DDR' : 'Nuevo Reporte DDR'}
          subtitle={isEditMode ? `Reporte #${id}` : 'Crear nuevo reporte diario de operaciones'}
          headerActions={
            <div className="flex gap-2 items-center">
              {/* Auto-save indicator */}
              {!isEditMode && (
                <AutoSaveIndicator
                  status={autoSaveStatus}
                  lastSaved={lastSaved}
                />
              )}
              {isEditMode && isDirty && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  Cambios sin guardar
                </span>
              )}
              <Button
                variant="outline"
                type="button"
                onClick={() => navigate('/reports')}
                icon={<ArrowLeft size={16} />}
              >
                Cancelar
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={handleSaveDraft}
                loading={isSaving}
                icon={<Save size={16} />}
              >
                Guardar Borrador
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={!isValid}
                icon={<Send size={16} />}
              >
                Enviar Reporte
              </Button>
            </div>
          }
        >
          <div className="max-w-7xl mx-auto">
            {/* Tabs Navigation */}
            <Card className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap
                        border-b-2 transition-colors
                        ${
                          activeTab === tab.id
                            ? 'border-[#1E3A5F] text-[#1E3A5F]'
                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        }
                      `}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </Card>

            {/* Validation Errors Summary */}
            {Object.keys(errors).length > 0 && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-red-800 mb-2">
                    Hay errores en el formulario:
                  </h3>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    {Object.entries(errors).map(([key, error]) => (
                      <li key={key}>{key}: {error?.message?.toString()}</li>
                    ))}
                  </ul>
                </div>
              </Card>
            )}

            {/* Tab Content */}
            <Card>
              {renderTabContent()}
            </Card>

            {/* Bottom Actions (Mobile friendly) */}
            <div className="mt-6 flex gap-3 justify-end lg:hidden">
              <Button
                variant="outline"
                type="button"
                onClick={() => navigate('/reports')}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={handleSaveDraft}
                loading={isSaving}
                className="flex-1"
              >
                Guardar
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={!isValid}
                className="flex-1"
              >
                Enviar
              </Button>
            </div>
          </div>
        </MainLayout>
      </form>
    </FormProvider>
  );
}
