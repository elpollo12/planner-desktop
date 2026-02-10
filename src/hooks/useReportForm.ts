import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../store';
import { type ReportFormState } from '../types';
import { type TabId, type WizardStep } from '../types/';

/**
 * Hook principal para manejar el estado del formulario de reportes
 */
export function useReportForm() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  
  const [formState, setFormState] = useState<ReportFormState>({
    wizardStep: 'header',
    activeTab: 'crew',
    loading: {
      saving: false,
      submitting: false,
      loadingReport: false,
    },
    report: {
      existing: null,
      id: id || null,
    },
  });

  // Getters
  const isEditMode = !!id;

  // Actions
  const setWizardStep = useCallback((step: WizardStep) => {
    setFormState(prev => ({
      ...prev,
      wizardStep: step,
    }));
  }, []);

  const setActiveTab = useCallback((tab: TabId) => {
    setFormState(prev => ({
      ...prev,
      activeTab: tab,
    }));
  }, []);

  const setExistingReport = useCallback((report: any | null) => {
    setFormState(prev => ({
      ...prev,
      report: {
        ...prev.report,
        existing: report,
      },
    }));
  }, []);

  const setReportId = useCallback((reportId: string | null) => {
    setFormState(prev => ({
      ...prev,
      report: {
        ...prev.report,
        id: reportId,
      },
    }));
  }, []);

  // Loading state actions
  const setIsSaving = useCallback((saving: boolean) => {
    setFormState(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        saving,
      },
    }));
  }, []);

  const setIsSubmitting = useCallback((submitting: boolean) => {
    setFormState(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        submitting,
      },
    }));
  }, []);

  const setIsLoadingReport = useCallback((loading: boolean) => {
    setFormState(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        loadingReport: loading,
      },
    }));
  }, []);

  return {
    formState,
    isEditMode,
    user,
    actions: {
      setWizardStep,
      setActiveTab,
      setExistingReport,
      setReportId,
      setIsSaving,
      setIsSubmitting,
      setIsLoadingReport,
    },
  };
}