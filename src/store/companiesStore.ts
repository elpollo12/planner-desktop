import { create } from 'zustand';
import { companiesApi } from '../lib/api';
import type { Company, CompanyType, CreateCompanyInput, UpdateCompanyInput } from '../types/company';

interface CompanyLogos {
  [companyId: string]: string | null;
}

/** Argumento flexible para uploadLogo: File del browser o bytes ya procesados */
type LogoSource = File | { bytes: Uint8Array; name: string };

interface CompaniesState {
  companies: Company[];
  companyLogos: CompanyLogos;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadCompanies: (sessionToken: string, onlyActive?: boolean, companyType?: CompanyType) => Promise<void>;
  createCompany: (sessionToken: string, input: CreateCompanyInput) => Promise<Company>;
  updateCompany: (sessionToken: string, companyId: string, input: UpdateCompanyInput) => Promise<Company>;
  deleteCompany: (sessionToken: string, companyId: string) => Promise<void>;
  /** Acepta un File del browser O un objeto { bytes, name } de bytes ya procesados (ej: post-imgly) */
  uploadLogo: (sessionToken: string, companyId: string, source: LogoSource) => Promise<void>;
  removeLogo: (sessionToken: string, companyId: string) => Promise<void>;
  loadCompanyLogo: (sessionToken: string, companyId: string) => Promise<void>;
  clearCompanies: () => void;

  // Derived selectors
  operators: () => Company[];
  contractors: () => Company[];
}

export const useCompaniesStore = create<CompaniesState>()((set, get) => ({
  companies: [],
  companyLogos: {},
  isLoading: false,
  error: null,

  loadCompanies: async (sessionToken, onlyActive = true, companyType) => {
    set({ isLoading: true, error: null });
    try {
      const companies = await companiesApi.list(sessionToken, onlyActive, companyType);
      set({ companies, isLoading: false });

      // Cargar logos para empresas que ya tienen uno registrado
      for (const company of companies) {
        if (company.logo) {
          get().loadCompanyLogo(sessionToken, company.id);
        }
      }
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  createCompany: async (sessionToken, input) => {
    set({ isLoading: true, error: null });
    try {
      const company = await companiesApi.create(sessionToken, input);
      set((state) => ({
        companies: [...state.companies, company].sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: false,
      }));
      return company;
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  updateCompany: async (sessionToken, companyId, input) => {
    set({ isLoading: true, error: null });
    try {
      const company = await companiesApi.update(sessionToken, companyId, input);
      set((state) => ({
        companies: state.companies
          .map((c) => (c.id === companyId ? company : c))
          .sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: false,
      }));
      return company;
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  deleteCompany: async (sessionToken, companyId) => {
    set({ isLoading: true, error: null });
    try {
      await companiesApi.delete(sessionToken, companyId);
      set((state) => ({
        companies: state.companies.filter((c) => c.id !== companyId),
        companyLogos: { ...state.companyLogos, [companyId]: null },
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as string, isLoading: false });
      throw error;
    }
  },

  uploadLogo: async (sessionToken, companyId, source) => {
    // Normalizar la fuente a (bytes: number[], name: string)
    let fileData: number[];
    let fileName: string;

    if (source instanceof File) {
      const buffer = await source.arrayBuffer();
      fileData = Array.from(new Uint8Array(buffer));
      fileName = source.name;
    } else {
      // { bytes: Uint8Array, name: string } — ya procesado por imgly u otra vía
      fileData = Array.from(source.bytes);
      fileName = source.name;
    }

    const company = await companiesApi.uploadLogo(sessionToken, companyId, fileData, fileName);

    set((state) => ({
      companies: state.companies.map((c) => (c.id === companyId ? company : c)),
    }));

    await get().loadCompanyLogo(sessionToken, companyId);
  },

  removeLogo: async (sessionToken, companyId) => {
    const company = await companiesApi.removeLogo(sessionToken, companyId);
    set((state) => ({
      companies: state.companies.map((c) => (c.id === companyId ? company : c)),
      companyLogos: { ...state.companyLogos, [companyId]: null },
    }));
  },

  loadCompanyLogo: async (sessionToken, companyId) => {
    try {
      const logoData = await companiesApi.getLogo(sessionToken, companyId);
      set((state) => ({
        companyLogos: { ...state.companyLogos, [companyId]: logoData },
      }));
    } catch (error) {
      console.error(`Failed to load logo for company ${companyId}:`, error);
    }
  },

  clearCompanies: () => {
    set({ companies: [], companyLogos: {}, isLoading: false, error: null });
  },

  // Derived selectors
  operators: () => get().companies.filter((c) => c.companyType === 'operator'),
  contractors: () => get().companies.filter((c) => c.companyType === 'contractor'),
}));
