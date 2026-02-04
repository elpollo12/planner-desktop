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
// Rig (Taladro) Validation Schemas
// ============================================================================

export const createRigSchema = z.object({
  name: z.string()
    .min(1, 'El nombre del taladro es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  operator: z.string()
    .min(1, 'El operador es requerido')
    .max(100, 'El operador no puede exceder 100 caracteres')
    .trim(),
  power: z.string()
    .min(1, 'La potencia es requerida')
    .max(50, 'La potencia no puede exceder 50 caracteres')
    .trim(),
  areaId: z.string()
    .uuid('Debe seleccionar un área válida')
    .optional(),
});

export const updateRigSchema = z.object({
  name: z.string()
    .min(1, 'El nombre del taladro es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
  operator: z.string()
    .min(1, 'El operador es requerido')
    .max(100, 'El operador no puede exceder 100 caracteres')
    .trim()
    .optional(),
  power: z.string()
    .min(1, 'La potencia es requerida')
    .max(50, 'La potencia no puede exceder 50 caracteres')
    .trim()
    .optional(),
  areaId: z.string()
    .uuid('Debe seleccionar un área válida')
    .optional()
    .nullable(),
  active: z.boolean().optional(),
});

// ============================================================================
// Type inference from schemas
// ============================================================================

export type CreateAreaFormData = z.infer<typeof createAreaSchema>;
export type UpdateAreaFormData = z.infer<typeof updateAreaSchema>;
export type CreateRigFormData = z.infer<typeof createRigSchema>;
export type UpdateRigFormData = z.infer<typeof updateRigSchema>;
