import { invoke } from '@tauri-apps/api/core';
import type { Company, CompanyType, CreateCompanyInput, UpdateCompanyInput } from '../../types/company';

// ============================================================================
// Companies Commands
// ============================================================================

export const companiesApi = {
  list: (sessionToken: string, onlyActive: boolean = true, companyType?: CompanyType) =>
    invoke<Company[]>('list_companies', { sessionToken, onlyActive, companyType: companyType ?? null }),

  get: (sessionToken: string, companyId: string) =>
    invoke<Company | null>('get_company', { sessionToken, companyId }),

  create: (sessionToken: string, input: CreateCompanyInput) =>
    invoke<Company>('create_company', { sessionToken, input }),

  update: (sessionToken: string, companyId: string, input: UpdateCompanyInput) =>
    invoke<Company>('update_company', { sessionToken, companyId, input }),

  delete: (sessionToken: string, companyId: string) =>
    invoke<boolean>('delete_company', { sessionToken, companyId }),

  uploadLogo: (sessionToken: string, companyId: string, fileData: number[], fileName: string) =>
    invoke<Company>('upload_company_brand_logo', { sessionToken, companyId, fileData, fileName }),

  removeLogo: (sessionToken: string, companyId: string) =>
    invoke<Company>('remove_company_brand_logo', { sessionToken, companyId }),

  getLogo: (sessionToken: string, companyId: string) =>
    invoke<string | null>('get_company_brand_logo', { sessionToken, companyId }),
};
