/**
 * Utility to manage last report data for auto-filling new reports
 */

const STORAGE_KEY = 'last-report-template';

export interface LastReportTemplate {
  reportNumber: number;
  wellNumber?: string;
  apiNumber?: string;
  contract?: string;
  contractor?: string;
  operator?: string;
  fieldDistrict?: string;
  municipality?: string;
  rigNumber?: string;
  supervisor24h?: string;
}

/**
 * Save report header data as template for next report
 */
export function saveLastReportTemplate(data: LastReportTemplate): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving last report template:', error);
  }
}

/**
 * Load last report template and increment report number
 */
export function loadLastReportTemplate(): LastReportTemplate | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const template: LastReportTemplate = JSON.parse(stored);

    // Increment report number for the new report
    return {
      ...template,
      reportNumber: template.reportNumber + 1,
    };
  } catch (error) {
    console.error('Error loading last report template:', error);
    return null;
  }
}

/**
 * Clear stored template
 */
export function clearLastReportTemplate(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing last report template:', error);
  }
}
