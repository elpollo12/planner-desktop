import { create } from 'zustand';
import type { Report, FullReport, ReportFilters, OperationCode } from '../types';

interface ReportState {
  // Estado
  currentReport: FullReport | null;
  reports: Report[];
  operationCodes: OperationCode[];
  filters: ReportFilters;
  isLoading: boolean;

  // Acciones para reporte actual
  setCurrentReport: (report: FullReport | null) => void;
  updateCurrentReport: <K extends keyof FullReport>(
    field: K,
    value: FullReport[K]
  ) => void;
  clearCurrentReport: () => void;

  // Acciones para lista de reportes
  setReports: (reports: Report[]) => void;
  addReport: (report: Report) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
  removeReport: (id: string) => void;

  // Acciones para códigos de operación
  setOperationCodes: (codes: OperationCode[]) => void;

  // Acciones para filtros
  setFilters: (filters: ReportFilters) => void;
  clearFilters: () => void;

  // Loading
  setLoading: (loading: boolean) => void;
}

export const useReportStore = create<ReportState>((set, get) => ({
  currentReport: null,
  reports: [],
  operationCodes: [],
  filters: {},
  isLoading: false,

  setCurrentReport: (report) => set({ currentReport: report }),

  updateCurrentReport: (field, value) => {
    const { currentReport } = get();
    if (!currentReport) return;
    set({
      currentReport: {
        ...currentReport,
        [field]: value,
      },
    });
  },

  clearCurrentReport: () => set({ currentReport: null }),

  setReports: (reports) => set({ reports }),

  addReport: (report) =>
    set((state) => ({
      reports: [report, ...state.reports],
    })),

  updateReport: (id, updates) =>
    set((state) => ({
      reports: state.reports.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  removeReport: (id) =>
    set((state) => ({
      reports: state.reports.filter((r) => r.id !== id),
    })),

  setOperationCodes: (codes) => set({ operationCodes: codes }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  clearFilters: () => set({ filters: {} }),

  setLoading: (isLoading) => set({ isLoading }),
}));
