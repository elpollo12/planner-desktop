import { type CompleteReportData } from '../schemas';
import { type Report } from '../types/';
import { type TabId } from '../types/';

/**
 * Check if header section is complete and valid
 */
export function isHeaderValid(headerData: CompleteReportData['header']): boolean {
  if (!headerData) return false;

  const hasReportNumber = !!(headerData.reportNumber && headerData.reportNumber > 0);
  const hasReportDate = !!headerData.reportDate;

  return hasReportNumber && hasReportDate;
}

/**
 * Check if a section has data
 */
export function hasSectionData(sectionId: TabId, formData: CompleteReportData): boolean {
  switch (sectionId) {
    case 'drillString':
      return !!(formData.drillString && Object.keys(formData.drillString).length > 0);
    
    case 'crew':
      return !!(formData.crew?.shifts?.some(s => s.members.length > 0));
    
    case 'bits':
      return !!(formData.bitRecords?.records && formData.bitRecords.records.length > 0);
    
    case 'time':
      return !!(formData.timeDistribution?.distributions && formData.timeDistribution.distributions.length > 0);
    
    case 'mud':
      return !!(
        (formData.mudRecords?.records && formData.mudRecords.records.length > 0) ||
        (formData.mudRecords?.additives && formData.mudRecords.additives.length > 0)
      );
    
    case 'lithology':
      return !!(
        (formData.lithology?.drillingParameters && formData.lithology.drillingParameters.length > 0) ||
        (formData.lithology?.deviationHistory && formData.lithology.deviationHistory.length > 0)
      );
    
    case 'observations':
      return !!(formData.observations?.operations && formData.observations.operations.length > 0);
    
    default:
      return false;
  }
}

/**
 * Get section data summary
 */
export function getSectionSummary(tabId: string, formData: CompleteReportData): string {
  switch (tabId) {
    case 'crew':
      const memberCount = formData.crew?.shifts?.reduce(
        (sum: number, shift: { members: string | any[]; }) => sum + shift.members.length, 0
      ) || 0;
      return memberCount > 0 ? `${memberCount} miembros` : 'Sin datos';

    case 'time':
      const distCount = formData.timeDistribution?.distributions?.length || 0;
      return distCount > 0 ? `${distCount} operaciones` : 'Sin datos';

    case 'bits':
      const bitCount = formData.bitRecords?.records?.length || 0;
      return bitCount > 0 ? `${bitCount} mechas` : 'Sin datos';

    case 'mud':
      const mudCount = formData.mudRecords?.records?.length || 0;
      return mudCount > 0 ? `${mudCount} registros` : 'Sin datos';

    case 'lithology':
      const paramCount = formData.lithology?.drillingParameters?.length || 0;
      const devCount = formData.lithology?.deviationHistory?.length || 0;
      return paramCount > 0 || devCount > 0
        ? `${paramCount} parámetros, ${devCount} desviaciones`
        : 'Sin datos';

    case 'observations':
      const opsCount = formData.observations?.operations?.length || 0;
      return opsCount > 0 ? `${opsCount} observaciones` : 'Sin datos';

    case 'drillString':
      const hasData = formData.drillString && Object.keys(formData.drillString).length > 0;
      return hasData ? 'Configurado' : 'Sin datos';

    default:
      return 'Sin datos';
  }
}

/**
 * Check if user can edit this report
 */
export function checkEditPermissions(
  existingReport: Report | null,
  user: { id: string; role: string } | null
): boolean {
  if (!existingReport || !user) return true;

  if (user.role === 'admin') return true;
  if (user.role === 'supervisor') return true;

  if (user.role === 'operator') {
    return existingReport.status === 'draft' && existingReport.created_by === user.id;
  }

  return false;
}