import { z } from 'zod';

// ============================================================================
// HEADER SECTION SCHEMA
// ============================================================================

export const headerSectionSchema = z.object({
  // Campos obligatorios
  reportNumber: z.number().int().positive('El número de reporte debe ser positivo'),
  reportDate: z.string().min(1, 'La fecha es requerida'),
  wellNumber: z.string().min(1, 'El número de pozo es requerido'),
  rigNumber: z.string().min(1, 'El número de taladro es requerido'),
  operator: z.string().min(1, 'El operador es requerido'),
  
  // Campos opcionales
  apiNumber: z.string().optional(),
  contract: z.string().optional(),
  contractor: z.string().optional(),
  fieldDistrict: z.string().optional(),
  municipality: z.string().optional(),
  supervisor24h: z.string().optional(),
});

// ============================================================================
// CREW SECTION SCHEMA
// ============================================================================

export const crewMemberSchema = z.object({
  personnelId: z.string().optional(),
  position: z.string().min(1, 'La posición es requerida'),
  ci: z.string().optional(),
  name: z.string().optional(),
  hours: z.number().min(0).max(24).optional(),
});

export const crewShiftSchema = z.object({
  shift: z.enum(['morning', 'afternoon', 'night']),
  shiftStart: z.string().optional(),
  shiftEnd: z.string().optional(),
  members: z.array(crewMemberSchema).min(1, 'Debe haber al menos un miembro'),
});

export const crewSectionSchema = z.object({
  shifts: z.array(crewShiftSchema).length(3, 'Deben haber 3 turnos'),
});

// ============================================================================
// TIME DISTRIBUTION SECTION SCHEMA
// ============================================================================

export const timeDistributionItemSchema = z.object({
  operationCodeId: z.string().min(1, 'Código de operación requerido'),
  hoursShift1: z.number().min(0).max(24, 'Máximo 24 horas'),
  hoursShift2: z.number().min(0).max(24, 'Máximo 24 horas'),
  hoursShift3: z.number().min(0).max(24, 'Máximo 24 horas'),
});

export const timeDistributionSectionSchema = z.object({
  distributions: z.array(timeDistributionItemSchema),
}).refine(
  (data) => {
    const shift1Total = data.distributions.reduce((sum, item) => sum + item.hoursShift1, 0);
    const shift2Total = data.distributions.reduce((sum, item) => sum + item.hoursShift2, 0);
    const shift3Total = data.distributions.reduce((sum, item) => sum + item.hoursShift3, 0);
    return shift1Total === 24 && shift2Total === 24 && shift3Total === 24;
  },
  { message: 'Cada turno debe sumar exactamente 24 horas' }
);
