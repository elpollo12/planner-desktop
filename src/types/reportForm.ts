export type TabId = 'crew' | 'time' | 'bits' | 'mud' | 'lithology' | 'observations' | 'drillString';

export interface Tab {
  id: TabId;
  label: string;
  icon: string;
  description: string;
}

export type WizardStep = 'header' | 'sections';

export interface ReportFormState {
  wizardStep: WizardStep;
  activeTab: TabId;
  loading: {
    saving: boolean;
    submitting: boolean;
    loadingReport: boolean;
  };
  report: {
    existing: any | null; // Type as Report from types/report when imported
    id: string | null;
  };
}

export interface SectionSelectorProps {
  tabs: Tab[];
  activeTab: TabId;
  onTabSelect: (tabId: TabId) => void;
  getSectionSummary: (tabId: TabId) => string;
  hasSectionData: (tabId: TabId) => boolean;
}

export interface ReportFormHeaderProps {
  onContinue: () => void;
  isValid: boolean;
  errors: any;
}

export interface ReportFormSectionsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onSave: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isSubmitting: boolean;
  canEdit: boolean;
}

export interface HeaderSummaryProps {
  headerData: {
    reportNumber: number;
    reportDate: string;
    wellNumber?: string;
    rigNumber?: string;
    supervisor24h?: string;
  };
  onEdit: () => void;
}