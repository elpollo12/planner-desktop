// ============================================================================
// Areas Commands (Admin Only)
// ============================================================================

import { Area, CreateAreaInput, CreateRigInput, Rig, RigWithArea, UpdateAreaInput, UpdateRigInput } from "@/types";
import { invoke } from "@tauri-apps/api/core";

export const areasApi = {
  /**
   * Crear una nueva área
   */
  create: (userId: string, input: CreateAreaInput) =>
    invoke<Area>('create_area', { input, userId }),

  /**
   * Listar todas las áreas
   * @param includeInactive - Si se deben incluir áreas inactivas
   */
  list: (includeInactive: boolean = false) =>
    invoke<Area[]>('list_areas', { includeInactive }),

  /**
   * Obtener un área por ID
   */
  get: (id: string) =>
    invoke<Area>('get_area', { id }),

  /**
   * Actualizar un área existente
   */
  update: (id: string, userId: string, input: UpdateAreaInput) =>
    invoke<Area>('update_area', { id, input, userId }),

  /**
   * Eliminar un área
   */
  delete: (id: string) =>
    invoke<void>('delete_area', { id }),
};

// ============================================================================
// Rigs Commands (Admin Only)
// ============================================================================

export const rigsApi = {
  /**
   * Crear un nuevo taladro
   */
  create: (userId: string, input: CreateRigInput) =>
    invoke<Rig>('create_rig', { input, userId }),

  /**
   * Listar todos los taladros
   * @param includeInactive - Si se deben incluir taladros inactivos
   */
  list: (includeInactive: boolean = false) =>
    invoke<RigWithArea[]>('list_rigs', { includeInactive }),

  /**
   * Obtener un taladro por ID con información del área
   */
  get: (id: string) =>
    invoke<RigWithArea>('get_rig', { id }),

  /**
   * Actualizar un taladro existente
   */
  update: (id: string, userId: string, input: UpdateRigInput) =>
    invoke<RigWithArea>('update_rig', { id, input, userId }),

  /**
   * Eliminar un taladro
   */
  delete: (id: string) =>
    invoke<void>('delete_rig', { id }),
};
