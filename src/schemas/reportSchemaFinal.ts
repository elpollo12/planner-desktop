import { z } from 'zod';

// ============================================================================
// LITHOLOGY/DRILLING SECTION SCHEMA
// ============================================================================

export const drillingParameterSchema = z.object({
  shift: z.enum(['morning', 'afternoon', 'night']).optional(),
  depthFrom: z.string().optional(),
  depthTo: z.string().optional(),
  coreNumber: z.string().optional(),
  rotaryRpm: z.string().optional(),
  bitWeight: z.string().optional(),
  pumpPressure: z.string().optional(),
  pumpNumber: z.string().optional(),
  pumpLiner: z.string().optional(),
  pumpSpm: z.string().optional(),
  totalGpm: z.string().optional(),
  methodUsed: z.string().optional(),
  lithologyNotes: z.string().optional(),
}).refine(
  (data) => {
    if (data.depthFrom && data.depthTo) {
      const from = parseFloat(data.depthFrom);
      const to = parseFloat(data.depthTo);
      return !isNaN(from) && !isNaN(to) && to >= from;
    }
    return true;
  },
  { message: 'La profundidad final debe ser mayor o igual a la inicial', path: ['depthTo'] }
);

export const deviationRecordSchema = z.object({
  depth: z.string().optional(),
  deviation: z.string().optional(),
  direction: z.string().optional(),
  tvo: z.string().optional(),
  horizontalDisplacement: z.string().optional(),
});

export const lithologySectionSchema = z.object({
  drillingParameters: z.array(drillingParameterSchema),
  deviationHistory: z.array(deviationRecordSchema),
});

// ============================================================================
// OBSERVATIONS/OPERATIONS LOG SECTION SCHEMA
// ============================================================================

export const operationLogSchema = z.object({
  shift: z.enum(['morning', 'afternoon', 'night']).optional(),
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
  duration: z.string().optional(),
  operationCode: z.string().optional(),
  details: z.string().optional(),
});

export const observationsSectionSchema = z.object({
  operations: z.array(operationLogSchema),
});

// ============================================================================
// DRILL STRING SCHEMA
// ============================================================================

export const drillStringComponentSchema = z.object({
  pieceName: z.string().min(1, 'Nombre de pieza es requerido'),
  length: z.number().optional(),
});

export const drillStringSectionSchema = z.object({
  components: z.array(drillStringComponentSchema),
});
