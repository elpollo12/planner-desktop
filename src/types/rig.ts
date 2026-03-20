// ============================================================================
// TYPES: Areas y Rigs (Taladros)
// ============================================================================

// ─── Area Types ─────────────────────────────────────────────────────────────

export interface Area {
  id: string;
  name: string;
  country: string;
  state: string;
  active: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAreaInput {
  name: string;
  country: string;
  state: string;
  active: boolean;
}

export interface UpdateAreaInput {
  name?: string;
  country?: string;
  state?: string;
  active?: boolean;
}

// ─── Rig Contractor Types ────────────────────────────────────────────────────

export interface RigContractor {
  id: string;
  rigId: string;
  companyId: string;
  createdAt: string;
}

export interface RigContractorWithCompany extends RigContractor {
  companyName: string;
}

/** Embedded in RigFull — contractor entry joined with company info */
export interface RigContractorEntry {
  rigContractorId: string;
  companyId: string;
  companyName: string;
}

export interface AddRigContractorInput {
  companyId: string;
}

// ─── Rig (Taladro) Types ─────────────────────────────────────────────────────

export interface Rig {
  id: string;
  name: string;
  /** Legacy text field — kept for backwards-compat */
  operator: string;
  operatorId?: string;
  power: string;
  areaId?: string;
  active: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/** Rig joined with area and operator name — used in list views */
export interface RigWithArea extends Rig {
  operatorName?: string;
  areaName?: string;
  areaCountry?: string;
  areaState?: string;
}

/** Full rig data including contractor list — used by the wizard */
export interface RigFull extends RigWithArea {
  contractors: RigContractorEntry[];
}

export interface CreateRigInput {
  name: string;
  /** Legacy text — still sent for backwards-compat */
  operator: string;
  /** Required FK — must be a valid company id with type 'operator' */
  operatorId: string;
  power: string;
  areaId: string;
  active?: boolean;
  /** At least one contractor id required */
  contractorIds: string[];
}

export interface UpdateRigInput {
  name?: string;
  operator?: string;
  operatorId?: string;
  power?: string;
  areaId?: string;
  active?: boolean;
}

// ─── Rig Personnel (Cuadrilla asociada al taladro) ───────────────────────────

export interface RigPersonnel {
  id: string;
  rigId: string;
  name: string;
  ci?: string;
  defaultPosition: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRigPersonnelInput {
  name: string;
  ci?: string;
  defaultPosition: string;
}

export interface UpdateRigPersonnelInput {
  name?: string;
  ci?: string;
  defaultPosition?: string;
  active?: boolean;
}

// ─── UI Helper Types ─────────────────────────────────────────────────────────

export interface AreaOption {
  value: string;
  label: string;
  country?: string;
  state?: string;
}

export interface RigOption {
  value: string;
  label: string;
  operatorName?: string;
  areaName?: string;
}

export interface AreaFilters {
  includeInactive?: boolean;
  country?: string;
  state?: string;
  searchTerm?: string;
}

export interface RigFilters {
  includeInactive?: boolean;
  areaId?: string;
  operatorId?: string;
  searchTerm?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const AREA_REQUIRED_FIELDS = ['name', 'country', 'state'] as const;
export const RIG_REQUIRED_FIELDS = ['name', 'operatorId', 'areaId', 'power', 'contractorIds'] as const;

export const COMMON_COUNTRIES = [
  'Venezuela',
  'Colombia',
  'Ecuador',
  'Perú',
  'Bolivia',
  'Argentina',
  'Chile',
  'Brasil',
  'México',
  'Estados Unidos',
  'Canadá',
] as const;

export const VENEZUELA_STATES = [
  'Anzoátegui',
  'Apure',
  'Barinas',
  'Bolívar',
  'Carabobo',
  'Cojedes',
  'Delta Amacuro',
  'Falcón',
  'Guárico',
  'Lara',
  'Mérida',
  'Miranda',
  'Monagas',
  'Nueva Esparta',
  'Portuguesa',
  'Sucre',
  'Táchira',
  'Trujillo',
  'Vargas',
  'Yaracuy',
  'Zulia',
  'Distrito Capital',
] as const;
