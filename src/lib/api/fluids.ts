import { invoke } from '@tauri-apps/api/core';
import type {
  FluidReport,
  FluidReportFull,
  FluidReportFilters,
  FluidProduct,
  FluidChangelogEntry,
  PaginatedFluidReportsResponse,
  CreateFluidReportInput,
} from '../../types/fluid';

// ============================================================================
// Fluid Report Commands
// ============================================================================

export const fluidsApi = {
  list: (sessionToken: string, filters: FluidReportFilters) =>
    invoke<PaginatedFluidReportsResponse>('list_fluid_reports', { sessionToken, filters }),

  get: (sessionToken: string, fluidReportId: string) =>
    invoke<FluidReportFull>('get_fluid_report', { sessionToken, fluidReportId }),

  create: (sessionToken: string, data: CreateFluidReportInput) =>
    invoke<FluidReport>('create_fluid_report', { sessionToken, data }),

  saveTab1: (sessionToken: string, fluidReportId: string, data: unknown) =>
    invoke('save_fluid_tab1', { sessionToken, fluidReportId, data }),

  saveTab2: (sessionToken: string, fluidReportId: string, data: unknown) =>
    invoke('save_fluid_tab2', { sessionToken, fluidReportId, data }),

  saveTab3: (sessionToken: string, fluidReportId: string, data: unknown) =>
    invoke('save_fluid_tab3', { sessionToken, fluidReportId, data }),

  delete: (sessionToken: string, fluidReportId: string) =>
    invoke<void>('delete_fluid_report', { sessionToken, fluidReportId }),

  listChangelog: (sessionToken: string, fluidReportId: string) =>
    invoke<FluidChangelogEntry[]>('list_fluid_changelog', { sessionToken, fluidReportId }),
};

// ============================================================================
// Fluid Product Catalog Commands
// ============================================================================

export const fluidProductsApi = {
  listAll: (sessionToken: string) =>
    invoke<FluidProduct[]>('list_fluid_products', { sessionToken }),

  listActive: (sessionToken: string) =>
    invoke<FluidProduct[]>('list_fluid_products_active', { sessionToken }),

  create: (sessionToken: string, data: { code: string; name: string; ge?: number; package?: string; weightLbs?: number; volGal?: number }) =>
    invoke<FluidProduct>('create_fluid_product', { sessionToken, data }),

  update: (sessionToken: string, productId: string, data: { code?: string; name?: string; ge?: number; package?: string; weightLbs?: number; volGal?: number; active?: boolean }) =>
    invoke<FluidProduct>('update_fluid_product', { sessionToken, productId, data }),
};
