import { invoke } from '@tauri-apps/api/core';
import type {
  Area,
  CreateAreaInput,
  UpdateAreaInput,
  RigWithArea,
  RigFull,
  RigContractor,
  RigContractorWithCompany,
  AddRigContractorInput,
  CreateRigInput,
  UpdateRigInput,
  RigPersonnel,
  CreateRigPersonnelInput,
  UpdateRigPersonnelInput,
} from '../../types/rig';

// ============================================================================
// Areas Commands
// ============================================================================

export const areasApi = {
  create: (userId: string, input: CreateAreaInput) =>
    invoke<Area>('create_area', { input, userId }),

  list: (includeInactive: boolean = false) =>
    invoke<Area[]>('list_areas', { includeInactive }),

  get: (id: string) =>
    invoke<Area>('get_area', { id }),

  update: (id: string, userId: string, input: UpdateAreaInput) =>
    invoke<Area>('update_area', { id, input, userId }),

  delete: (id: string) =>
    invoke<void>('delete_area', { id }),
};

// ============================================================================
// Rigs Commands
// ============================================================================

export const rigsApi = {
  /** Crear un nuevo taladro con area, operador y contratistas */
  create: (userId: string, input: CreateRigInput) =>
    invoke<RigFull>('create_rig', { input, userId }),

  /** Listar todos los taladros (vista resumida con área y operador) */
  list: (includeInactive: boolean = false) =>
    invoke<RigWithArea[]>('list_rigs', { includeInactive }),

  /** Listar taladros accesibles por el usuario actual (basado en permisos) */
  listAccessible: (sessionToken: string, includeInactive: boolean = false) =>
    invoke<RigWithArea[]>('list_accessible_rigs', { sessionToken, includeInactive }),

  /** Obtener taladro con área + operador (sin contratistas) */
  get: (id: string) =>
    invoke<RigFull>('get_rig', { id }),

  /** Obtener taladro completo con área, operador y contratistas — para el wizard de edición */
  getFull: (id: string) =>
    invoke<RigFull>('get_rig_full', { id }),

  /** Actualizar datos básicos del taladro */
  update: (id: string, userId: string, input: UpdateRigInput) =>
    invoke<RigFull>('update_rig', { id, input, userId }),

  /** Soft-delete del taladro */
  delete: (id: string) =>
    invoke<void>('delete_rig', { id }),
};

// ============================================================================
// Rig Contractors Commands
// ============================================================================

export const rigContractorsApi = {
  /** Listar contratistas asignados a un taladro */
  list: (rigId: string) =>
    invoke<RigContractorWithCompany[]>('list_rig_contractors', { rigId }),

  /** Agregar un contratista a un taladro (idempotente) */
  add: (rigId: string, input: AddRigContractorInput) =>
    invoke<RigContractor>('add_rig_contractor', { rigId, input }),

  /** Eliminar un contratista por rig_contractor id */
  remove: (id: string) =>
    invoke<void>('remove_rig_contractor', { id }),

  /** Reemplazar toda la lista de contratistas (usado en edición) */
  replaceAll: (rigId: string, companyIds: string[]) =>
    invoke<RigContractor[]>('replace_rig_contractors', { rigId, companyIds }),
};

// ============================================================================
// Rig Personnel Commands
// ============================================================================

export const rigPersonnelApi = {
  create: (rigId: string, input: CreateRigPersonnelInput) =>
    invoke<RigPersonnel>('create_rig_personnel', { rigId, input }),

  list: (rigId: string, includeInactive: boolean = false) =>
    invoke<RigPersonnel[]>('list_rig_personnel', { rigId, includeInactive }),

  update: (id: string, input: UpdateRigPersonnelInput) =>
    invoke<RigPersonnel>('update_rig_personnel', { id, input }),

  delete: (id: string) =>
    invoke<void>('delete_rig_personnel', { id }),
};
