import { z } from 'zod';

// ============================================================================
// Area Validation Schemas
// ============================================================================

export const createAreaSchema = z.object({
  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  country: z.string()
    .min(1, 'El país es requerido')
    .max(50, 'El país no puede exceder 50 caracteres')
    .trim(),
  state: z.string()
    .min(1, 'El estado/provincia es requerido')
    .max(50, 'El estado no puede exceder 50 caracteres')
    .trim(),
  active: z.boolean(),
});

export const updateAreaSchema = z.object({
  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
  country: z.string()
    .min(1, 'El país es requerido')
    .max(50, 'El país no puede exceder 50 caracteres')
    .trim()
    .optional(),
  state: z.string()
    .min(1, 'El estado/provincia es requerido')
    .max(50, 'El estado no puede exceder 50 caracteres')
    .trim()
    .optional(),
  active: z.boolean().optional(),
});

// ============================================================================
// Rig — Step schemas (used per-step in the wizard)
// ============================================================================

/** Step 1 — datos básicos del header (nombre, potencia, activo) */
export const rigBasicSchema = z.object({
  name: z.string()
    .min(1, 'El nombre del taladro es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  power: z.string()
    .min(1, 'La potencia es requerida')
    .max(50, 'La potencia no puede exceder 50 caracteres')
    .trim(),
  active: z.boolean().default(true),
});

/** Step 1 — selección o creación de área */
export const rigAreaStepSchema = z.object({
  areaId: z.string()
    .min(1, 'El área es requerida')
    .uuid('Debe seleccionar un área válida'),
});

/** Step 2 — selección o creación de operador */
export const rigOperatorStepSchema = z.object({
  operatorId: z.string()
    .min(1, 'El operador es requerido')
    .uuid('Debe seleccionar un operador válido'),
});

/** Step 3 — lista de contratistas (mínimo 1) */
export const rigContractorsStepSchema = z.object({
  contractorIds: z
    .array(z.string().uuid('ID de contratista inválido'))
    .min(1, 'Se requiere al menos un contratista'),
});

// ============================================================================
// Rig — Inline creation schemas (crear área/empresa desde el wizard sin salir)
// ============================================================================

/** Inline — crear área nueva dentro del paso 1 */
export const inlineAreaSchema = z.object({
  name: z.string()
    .min(1, 'El nombre del área es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  country: z.string()
    .min(1, 'El país es requerido')
    .max(50, 'El país no puede exceder 50 caracteres')
    .trim(),
  state: z.string()
    .min(1, 'El estado es requerido')
    .max(50, 'El estado no puede exceder 50 caracteres')
    .trim(),
});

/** Inline — crear operador/contratista nuevo dentro del wizard */
export const inlineCompanySchema = z.object({
  name: z.string()
    .min(1, 'El nombre de la empresa es requerido')
    .max(120, 'El nombre no puede exceder 120 caracteres')
    .trim(),
});

// ============================================================================
// Rig — Full schemas (usados en edición, agrupan todos los pasos)
// ============================================================================

export const createRigSchema = z.object({
  name: z.string()
    .min(1, 'El nombre del taladro es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  // Legacy field — still sent for backwards compat, derived from operatorId
  operator: z.string().default(''),
  operatorId: z.string()
    .min(1, 'El operador es requerido')
    .uuid('Debe seleccionar un operador válido'),
  power: z.string()
    .min(1, 'La potencia es requerida')
    .max(50, 'La potencia no puede exceder 50 caracteres')
    .trim(),
  areaId: z.string()
    .min(1, 'El área es requerida')
    .uuid('Debe seleccionar un área válida'),
  active: z.boolean().default(true),
  contractorIds: z
    .array(z.string().uuid('ID de contratista inválido'))
    .min(1, 'Se requiere al menos un contratista'),
});

export const updateRigSchema = z.object({
  name: z.string()
    .min(1, 'El nombre del taladro es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
  operator: z.string().optional(),
  operatorId: z.string()
    .uuid('Debe seleccionar un operador válido')
    .optional(),
  power: z.string()
    .min(1, 'La potencia es requerida')
    .max(50, 'La potencia no puede exceder 50 caracteres')
    .trim()
    .optional(),
  areaId: z.string()
    .uuid('Debe seleccionar un área válida')
    .optional(),
  active: z.boolean().optional(),
});

// ============================================================================
// Type inference
// ============================================================================

export type CreateAreaFormData     = z.infer<typeof createAreaSchema>;
export type UpdateAreaFormData     = z.infer<typeof updateAreaSchema>;

export type RigBasicFormData       = z.input<typeof rigBasicSchema>;
export type RigBasicOutputData     = z.output<typeof rigBasicSchema>;
export type RigAreaStepFormData    = z.infer<typeof rigAreaStepSchema>;
export type RigOperatorStepFormData = z.infer<typeof rigOperatorStepSchema>;
export type RigContractorsStepFormData = z.infer<typeof rigContractorsStepSchema>;

export type InlineAreaFormData     = z.infer<typeof inlineAreaSchema>;
export type InlineCompanyFormData  = z.infer<typeof inlineCompanySchema>;

export type CreateRigFormData      = z.infer<typeof createRigSchema>;
export type UpdateRigFormData      = z.infer<typeof updateRigSchema>;
