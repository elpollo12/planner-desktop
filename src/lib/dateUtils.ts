/**
 * Format a date string (YYYY-MM-DD) to dd/mm/yyyy
 */
export function formatDateDMY(dateStr: string | null | undefined): string {
  if (!dateStr) return '';

  try {
    // If dateStr is already in YYYY-MM-DD format
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }

    // Fallback: try to parse as Date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();

    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
}

/**
 * Convert dd/mm/yyyy to YYYY-MM-DD
 */
export function parseDateDMY(dateStr: string): string {
  if (!dateStr) return '';

  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return dateStr;
}

/**
 * Format an ISO datetime string to HH:mm
 */
export function formatTimeHM(dateStr: string | null | undefined): string {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '';
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayYMD(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get today's date in dd/mm/yyyy format
 */
export function getTodayDMY(): string {
  const today = new Date();
  const d = String(today.getDate()).padStart(2, '0');
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const y = today.getFullYear();
  return `${d}/${m}/${y}`;
}
