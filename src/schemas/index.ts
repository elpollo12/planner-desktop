// Export all schemas
export * from './reportSchema';
export * from './reportSchemaExtended';
export * from './reportSchemaFinal';
export * from './rigSchemas';
export * from './logisticsSchemas';

import { z } from 'zod';
import {
  headerSectionSchema,
  crewSectionSchema,
  timeDistributionSectionSchema,
} from './reportSchema';

import {
  bitRecordSectionSchema,
  mudRecordSectionSchema,
} from './reportSchemaExtended';

import {
  lithologySectionSchema,
  observationsSectionSchema,
  drillStringSectionSchema,
} from './reportSchemaFinal';

// ============================================================================
// COMPLETE REPORT SCHEMA
// ============================================================================

export const completeReportSchema = z.object({
  header: headerSectionSchema,
  crew: crewSectionSchema.optional(),
  timeDistribution: timeDistributionSectionSchema.optional(),
  bitRecords: bitRecordSectionSchema.optional(),
  mudRecords: mudRecordSectionSchema.optional(),
  lithology: lithologySectionSchema.optional(),
  observations: observationsSectionSchema.optional(),
  drillString: drillStringSectionSchema.optional(),
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type CompleteReportData = z.infer<typeof completeReportSchema>;
export type HeaderSectionData = z.infer<typeof headerSectionSchema>;
export type CrewSectionData = z.infer<typeof crewSectionSchema>;
export type TimeDistributionSectionData = z.infer<typeof timeDistributionSectionSchema>;
export type BitRecordSectionData = z.infer<typeof bitRecordSectionSchema>;
export type MudRecordSectionData = z.infer<typeof mudRecordSectionSchema>;
export type LithologySectionData = z.infer<typeof lithologySectionSchema>;
export type ObservationsSectionData = z.infer<typeof observationsSectionSchema>;
export type DrillStringSectionData = z.infer<typeof drillStringSectionSchema>;
