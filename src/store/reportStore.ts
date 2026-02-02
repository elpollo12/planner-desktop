import { create } from 'zustand';
import type { Report, ReportFilters } from '../types';

interface ReportState {
  // Estado
  currentReport: Report | null;
  reports: Report[];
  filters: ReportFilters;
  isLoading: boolean;

  // Acciones para reporte actual
  setCurrentReport: (report: Report | null) => void;
  updateCurrentReport: <K extends keyof Report>(
    field: K,
    value: Report[K]
  ) => void;
  clearCurrentReport: () => void;

  // Acciones para lista de reportes
  setReports: (reports: Report[]) => void;
  addReport: (report: Report) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
  removeReport: (id: string) => void;

  // Acciones para códigos de operación

  // Acciones para filtros
  setFilters: (filters: ReportFilters) => void;
  clearFilters: () => void;

  // Loading
  setLoading: (loading: boolean) => void;

  // Helpers
  getFilteredReports: () => Report[];
  getReportById: (id: string) => Report | undefined;
  getReportStats: () => {
    total: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
  };
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
      reports: state.reports.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),

  removeReport: (id) =>
    set((state) => ({
      reports: state.reports.filter((r) => r.id !== id),
    })),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  clearFilters: () => set({ filters: {} }),

  setLoading: (isLoading) => set({ isLoading }),

  // Helper: Get filtered reports
  getFilteredReports: () => {
    const { reports, filters } = get();
    let filtered = [...reports];

    if (filters.status) {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    if (filters.well_number) {
      filtered = filtered.filter((r) =>
        r.well_number?.toLowerCase().includes(filters.well_number!.toLowerCase())
      );
    }

    if (filters.date_from) {
      filtered = filtered.filter((r) => r.report_date >= filters.date_from!);
    }

    if (filters.date_to) {
      filtered = filtered.filter((r) => r.report_date <= filters.date_to!);
    }

    if (filters.created_by) {
      filtered = filtered.filter((r) => r.created_by === filters.created_by);
    }

    return filtered;
  },

  // Helper: Get report by ID
  getReportById: (id: string) => {
    const { reports } = get();
    return reports.find((r) => r.id === id);
  },

  // Helper: Get report stats
  getReportStats: () => {
    const { reports } = get();
    return {
      total: reports.length,
      draft: reports.filter((r) => r.status === 'draft').length,
      submitted: reports.filter((r) => r.status === 'submitted').length,
      approved: reports.filter((r) => r.status === 'approved').length,
      rejected: reports.filter((r) => r.status === 'rejected').length,
    };
  },
}));