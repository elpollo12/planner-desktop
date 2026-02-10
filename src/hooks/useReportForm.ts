import { useReducer, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../store';
import { type ReportFormState } from '../types';
import { type TabId, type WizardStep } from '../types/';

// ============================================
// ACTION TYPES
// ============================================
type ReportFormAction =
  | { type: 'SET_WIZARD_STEP'; payload: WizardStep }
  | { type: 'SET_ACTIVE_TAB'; payload: TabId }
  | { type: 'SET_EXISTING_REPORT'; payload: any | null }
  | { type: 'SET_REPORT_ID'; payload: string | null }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_LOADING_REPORT'; payload: boolean }
  | { type: 'SET_LOADING_STATE'; payload: { key: 'saving' | 'submitting' | 'loadingReport'; value: boolean } }
  | { type: 'RESET_FORM' };

// ============================================
// REDUCER
// ============================================
function reportFormReducer(state: ReportFormState, action: ReportFormAction): ReportFormState {
  switch (action.type) {
    case 'SET_WIZARD_STEP':
      return {
        ...state,
        wizardStep: action.payload,
      };

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.payload,
      };

    case 'SET_EXISTING_REPORT':
      return {
        ...state,
        report: {
          ...state.report,
          existing: action.payload,
        },
      };

    case 'SET_REPORT_ID':
      return {
        ...state,
        report: {
          ...state.report,
          id: action.payload,
        },
      };

    case 'SET_SAVING':
      return {
        ...state,
        loading: {
          ...state.loading,
          saving: action.payload,
        },
      };

    case 'SET_SUBMITTING':
      return {
        ...state,
        loading: {
          ...state.loading,
          submitting: action.payload,
        },
      };

    case 'SET_LOADING_REPORT':
      return {
        ...state,
        loading: {
          ...state.loading,
          loadingReport: action.payload,
        },
      };

    case 'SET_LOADING_STATE':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      };

    case 'RESET_FORM':
      return {
        wizardStep: 'header',
        activeTab: 'crew',
        loading: {
          saving: false,
          submitting: false,
          loadingReport: false,
        },
        report: {
          existing: null,
          id: null,
        },
      };

    default:
      return state;
  }
}

// ============================================
// HOOK
// ============================================
/**
 * Hook principal para manejar el estado del formulario de reportes
 * Usa useReducer para optimizar re-renders
 */
export function useReportForm() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  
  const [formState, dispatch] = useReducer(reportFormReducer, {
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

  // Actions (memoized)
  const actions = {
    setWizardStep: useCallback((step: WizardStep) => {
      dispatch({ type: 'SET_WIZARD_STEP', payload: step });
    }, []),

    setActiveTab: useCallback((tab: TabId) => {
      dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
    }, []),

    setExistingReport: useCallback((report: any | null) => {
      dispatch({ type: 'SET_EXISTING_REPORT', payload: report });
    }, []),

    setReportId: useCallback((reportId: string | null) => {
      dispatch({ type: 'SET_REPORT_ID', payload: reportId });
    }, []),

    setIsSaving: useCallback((saving: boolean) => {
      dispatch({ type: 'SET_SAVING', payload: saving });
    }, []),

    setIsSubmitting: useCallback((submitting: boolean) => {
      dispatch({ type: 'SET_SUBMITTING', payload: submitting });
    }, []),

    setIsLoadingReport: useCallback((loading: boolean) => {
      dispatch({ type: 'SET_LOADING_REPORT', payload: loading });
    }, []),

    // BONUS: Nueva acción para resetear todo el formulario
    resetForm: useCallback(() => {
      dispatch({ type: 'RESET_FORM' });
    }, []),
  };

  return {
    formState,
    isEditMode,
    user,
    actions,
  };
}