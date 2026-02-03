import { z } from 'zod';

// ============================================================================
// BIT RECORD SECTION SCHEMA
// ============================================================================

export const bitRecordSchema = z.object({
  shift: z.enum(['morning', 'afternoon', 'night']).optional(),
  size: z.string().optional(),
  manufacturerCode: z.string().optional(),
  brand: z.string().optional(),
  bitType: z.string().optional(),
  serialNumber: z.string().optional(),
  jets: z.string().optional(),
  tfa: z.string().optional(),
  depthOut: z.string().optional(),
  depthIn: z.string().optional(),
  footage: z.string().optional(),
  hoursTotal: z.number().min(0).optional(),
  dpTubos: z.string().optional(),
  kelly: z.string().optional(),
});

export const bitRecordSectionSchema = z.object({
  records: z.array(bitRecordSchema),
});

// ============================================================================
// MUD RECORD SECTION SCHEMA
// ============================================================================

export const mudRecordSchema = z.object({
  shift: z.enum(['morning', 'afternoon', 'night']).optional(),
  hour: z.string().optional(),
  weight: z.string().optional(),
  viscosity: z.string().optional(),
  pvp: z.string().optional(),
  gels: z.string().optional(),
  filtrate: z.string().optional(),
  ph: z.string().optional(),
  solids: z.string().optional(),
});

export const mudAdditiveSchema = z.object({
  shift: z.enum(['morning', 'afternoon', 'night']).optional(),
  additiveType: z.string().min(1, 'Tipo de aditivo requerido'),
  quantity: z.string().optional(),
});

export const mudRecordSectionSchema = z.object({
  records: z.array(mudRecordSchema),
  additives: z.array(mudAdditiveSchema),
});
