// ============================================================================
// TYPES: Areas y Rigs (Taladros)
// ============================================================================

// Area Types
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

// Rig (Taladro) Types
export interface Rig {
  id: string;
  name: string;
  operator: string;
  power: string;
  areaId?: string;
  active: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RigWithArea extends Rig {
  areaName?: string;
  areaCountry?: string;
  areaState?: string;
}
export interface CreateRigInput {
  name: string;
  operator: string;
  power: string;
  areaId?: string;
  active?: boolean;
}

export interface UpdateRigInput {
  name?: string;
  operator?: string;
  power?: string;
  areaId?: string;
  active?: boolean;
}

// UI Helper Types
export interface AreaOption {
  value: string;
  label: string;
  country?: string;
  state?: string;
}

export interface RigOption {
  value: string;
  label: string;
  operator?: string;
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
  operator?: string;
  searchTerm?: string;
}

// Constants
export const AREA_REQUIRED_FIELDS = ['name', 'country', 'state'] as const;
export const RIG_REQUIRED_FIELDS = ['name', 'operator', 'power'] as const;

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
