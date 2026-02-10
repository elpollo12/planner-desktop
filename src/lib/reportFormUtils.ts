import { type CompleteReportData } from '../schemas';
import { type Report } from '../types/';
import { type TabId } from '../types/';
import { SECTION_CONFIG } from '../components/reportForm/config/sectionConfig';

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
  const config = SECTION_CONFIG[sectionId];
  return config ? config.hasData(formData) : false;
}

/**
 * Get section data summary
 */
export function getSectionSummary(tabId: TabId, formData: CompleteReportData): string {
  const config = SECTION_CONFIG[tabId];
  return config ? config.getSummary(formData) : 'Sin datos';
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