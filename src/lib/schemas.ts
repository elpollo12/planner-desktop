import { z } from 'zod';

// ============================================================================
// HEADER SECTION SCHEMA
// ============================================================================
export const headerSectionSchema = z.object({
  reportNumber: z.number().int().positive('El número de reporte debe ser positivo'),
  reportDate: z.string().min(1, 'La fecha es requerida'),
  wellNumber: z.string().optional(),
  apiNumber: z.string().optional(),
  contract: z.string().optional(),
  contractor: z.string().optional(),
  operator: z.string().optional(),
  fieldDistrict: z.string().optional(),
  municipality: z.string().optional(),
  rigNumber: z.string().optional(),
  company: z.string().optional(),
  supervisor24h: z.string().optional(),
});

export type HeaderSectionData = z.infer<typeof headerSectionSchema>;

// ============================================================================
// DRILL STRING SCHEMA
// ============================================================================
export const drillStringSchema = z.object({
  size: z.string().optional(),
  weight: z.string().optional(),
  grade: z.string().optional(),
  connectionType: z.string().optional(),
  stringNumber: z.string().optional(),
  pumpBrand: z.string().optional(),
  pumpType: z.string().optional(),
  headerLength: z.string().optional(),
});

export type DrillStringData = z.infer<typeof drillStringSchema>;

// ============================================================================
// CREW MEMBER SCHEMA
// ============================================================================
export const crewMemberSchema = z.object({
  position: z.string().min(1, 'La posición es requerida'),
  ci: z.string().optional(),
  name: z.string().optional(),
  hours: z.number().min(0).max(24, 'Las horas deben estar entre 0 y 24').optional(),
});

export const crewShiftSchema = z.object({
  shift: z.enum(['morning', 'afternoon', 'night'], {
    errorMap: () => ({ message: 'Seleccione un turno válido' }),
  }),
  shiftStart: z.string().optional(),
  shiftEnd: z.string().optional(),
  members: z.array(crewMemberSchema).min(1, 'Debe haber al menos un miembro en la cuadrilla'),
});

export type CrewMemberData = z.infer<typeof crewMemberSchema>;
export type CrewShiftData = z.infer<typeof crewShiftSchema>;

// ============================================================================
// BIT RECORD SCHEMA
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

export type BitRecordData = z.infer<typeof bitRecordSchema>;

// ============================================================================
// FULL REPORT SCHEMA (ALL SECTIONS COMBINED)
// ============================================================================
export const fullReportSchema = z.object({
  header: headerSectionSchema,
  drillString: drillStringSchema.optional(),
  crewShifts: z.array(crewShiftSchema).optional(),
  bitRecords: z.array(bitRecordSchema).optional(),
});

export type FullReportData = z.infer<typeof fullReportSchema>;
