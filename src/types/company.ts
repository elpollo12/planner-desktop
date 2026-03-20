export type CompanyType = 'operator' | 'contractor';

export interface Company {
  id: string;
  name: string;
  logo: string | null;
  companyType: CompanyType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyInput {
  name: string;
  companyType: CompanyType;
}

export interface UpdateCompanyInput {
  name?: string;
  companyType?: CompanyType;
  active?: boolean;
}
