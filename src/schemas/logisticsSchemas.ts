import { z } from 'zod';

// ============================================================================
// Movement Schemas (shared pattern for entries/exits)
// ============================================================================

export const waterBottlesMovementSchema = z.object({
  quantity: z
    .number({ message: 'La cantidad es requerida' })
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser mayor a 0'),
  notes: z.string().max(500, 'Máximo 500 caracteres').trim().optional(),
});

export const fuelMovementSchema = z.object({
  amount: z
    .number({ message: 'La cantidad es requerida' })
    .positive('La cantidad debe ser mayor a 0'),
  notes: z.string().max(500, 'Máximo 500 caracteres').trim().optional(),
});

export const materialMovementSchema = z.object({
  materialId: z.string().min(1, 'Selecciona un material'),
  quantity: z
    .number({ message: 'La cantidad es requerida' })
    .positive('La cantidad debe ser mayor a 0'),
  notes: z.string().max(500, 'Máximo 500 caracteres').trim().optional(),
});

// ============================================================================
// Vacuum Schema
// ============================================================================

export const vacuumActionSchema = z.object({
  actionName: z
    .string()
    .min(1, 'La acción es requerida')
    .max(200, 'Máximo 200 caracteres')
    .trim(),
  notes: z.string().max(500, 'Máximo 500 caracteres').trim().optional(),
});

// ============================================================================
// Request Schema
// ============================================================================

export const logisticsRequestSchema = z
  .object({
    requestType: z.enum(['water_bottles', 'fuel', 'material', 'vacuum'], {
      message: 'Selecciona un tipo de solicitud',
    }),
    quantity: z.number().positive('La cantidad debe ser mayor a 0').optional(),
    actionRequested: z.string().max(200, 'Máximo 200 caracteres').trim().optional(),
    materialId: z.string().optional(),
    notes: z.string().max(500, 'Máximo 500 caracteres').trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.requestType === 'water_bottles' || data.requestType === 'fuel') {
      if (!data.quantity || data.quantity <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La cantidad es requerida',
          path: ['quantity'],
        });
      }
    }
    if (data.requestType === 'material') {
      if (!data.materialId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecciona un material',
          path: ['materialId'],
        });
      }
      if (!data.quantity || data.quantity <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La cantidad es requerida',
          path: ['quantity'],
        });
      }
    }
    if (data.requestType === 'vacuum') {
      if (!data.actionRequested?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La acción solicitada es requerida',
          path: ['actionRequested'],
        });
      }
    }
  });

// ============================================================================
// Material Catalog Schema
// ============================================================================

export const createMaterialSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  unit: z
    .string()
    .min(1, 'La unidad es requerida')
    .max(30, 'Máximo 30 caracteres')
    .trim(),
  description: z.string().max(300, 'Máximo 300 caracteres').trim().optional(),
});

// ============================================================================
// Type inference
// ============================================================================

export type WaterBottlesMovementForm = z.infer<typeof waterBottlesMovementSchema>;
export type FuelMovementForm = z.infer<typeof fuelMovementSchema>;
export type MaterialMovementForm = z.infer<typeof materialMovementSchema>;
export type VacuumActionForm = z.infer<typeof vacuumActionSchema>;
export type LogisticsRequestForm = z.infer<typeof logisticsRequestSchema>;
export type CreateMaterialForm = z.infer<typeof createMaterialSchema>;
