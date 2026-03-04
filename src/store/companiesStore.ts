import { create } from 'zustand';
import { companiesApi } from '../lib/api';
import type { Company, CompanyType, CreateCompanyInput, UpdateCompanyInput } from '../types/company';

interface CompanyLogos {
  [companyId: string]: string | null;
}

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
  uploadLogo: (sessionToken: string, companyId: string, file: File) => Promise<void>;
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

      // Load logos for companies that have one
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

  uploadLogo: async (sessionToken, companyId, file) => {
    const buffer = await file.arrayBuffer();
    const fileData = Array.from(new Uint8Array(buffer));
    const company = await companiesApi.uploadLogo(sessionToken, companyId, fileData, file.name);

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

  // Derived selectors — filter from cached companies list
  operators: () => get().companies.filter((c) => c.companyType === 'operator'),
  contractors: () => get().companies.filter((c) => c.companyType === 'contractor'),
}));
