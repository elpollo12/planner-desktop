import { type CompleteReportData } from "@/schemas";
import { type TabId } from "@/types";


/**
 * Section configuration for data checks and summaries
 */
interface SectionConfig {
  id: TabId;
  label: string;
  hasData: (formData: CompleteReportData) => boolean;
  getSummary: (formData: CompleteReportData) => string;
}

export const SECTION_CONFIG: Record<TabId, SectionConfig> = {
  drillString: {
    id: 'drillString',
    label: 'Sarta de Perforación',
    hasData: (fd) => !!(fd.drillString && Object.keys(fd.drillString).length > 0),
    getSummary: (fd) => {
      const hasData = fd.drillString && Object.keys(fd.drillString).length > 0;
      return hasData ? 'Configurado' : 'Sin datos';
    },
  },

  crew: {
    id: 'crew',
    label: 'Cuadrilla',
    hasData: (fd) => !!(fd.crew?.shifts?.some(s => s.members.length > 0)),
    getSummary: (fd) => {
      const count = fd.crew?.shifts?.reduce((sum, shift) => sum + shift.members.length, 0) || 0;
      return count > 0 ? `${count} miembros` : 'Sin datos';
    },
  },

  time: {
    id: 'time',
    label: 'Distribución de Tiempo',
    hasData: (fd) => !!(fd.timeDistribution?.distributions && fd.timeDistribution.distributions.length > 0),
    getSummary: (fd) => {
      const count = fd.timeDistribution?.distributions?.length || 0;
      return count > 0 ? `${count} operaciones` : 'Sin datos';
    },
  },

  bits: {
    id: 'bits',
    label: 'Mechas',
    hasData: (fd) => !!(fd.bitRecords?.records && fd.bitRecords.records.length > 0),
    getSummary: (fd) => {
      const count = fd.bitRecords?.records?.length || 0;
      return count > 0 ? `${count} mechas` : 'Sin datos';
    },
  },

  mud: {
    id: 'mud',
    label: 'Lodo',
    hasData: (fd) => !!(
      (fd.mudRecords?.records && fd.mudRecords.records.length > 0) ||
      (fd.mudRecords?.additives && fd.mudRecords.additives.length > 0)
    ),
    getSummary: (fd) => {
      const count = fd.mudRecords?.records?.length || 0;
      return count > 0 ? `${count} registros` : 'Sin datos';
    },
  },

  lithology: {
    id: 'lithology',
    label: 'Litología',
    hasData: (fd) => !!(
      (fd.lithology?.drillingParameters && fd.lithology.drillingParameters.length > 0) ||
      (fd.lithology?.deviationHistory && fd.lithology.deviationHistory.length > 0)
    ),
    getSummary: (fd) => {
      const paramCount = fd.lithology?.drillingParameters?.length || 0;
      const devCount = fd.lithology?.deviationHistory?.length || 0;
      return paramCount > 0 || devCount > 0
        ? `${paramCount} parámetros, ${devCount} desviaciones`
        : 'Sin datos';
    },
  },

  observations: {
    id: 'observations',
    label: 'Observaciones',
    hasData: (fd) => !!(fd.observations?.operations && fd.observations.operations.length > 0),
    getSummary: (fd) => {
      const count = fd.observations?.operations?.length || 0;
      return count > 0 ? `${count} observaciones` : 'Sin datos';
    },
  },
};

/**
 * Helper function to get section config
 */
export function getSectionConfig(tabId: TabId): SectionConfig | undefined {
  return SECTION_CONFIG[tabId];
}