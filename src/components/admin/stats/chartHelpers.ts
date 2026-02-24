/**
 * Chart color utilities for admin statistics.
 *
 * Maps incident type badge colors to Tailwind-equivalent hex values
 * and provides a consistent palette for logistics/activity charts.
 */

import { useState, useEffect } from 'react';

// Palette for pie/bar charts (category colors)
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
] as const;

// Maps the incident_types.color string → hex
export const INCIDENT_COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  blue: '#3b82f6',
  green: '#10b981',
  purple: '#8b5cf6',
  gray: '#6b7280',
  yellow: '#eab308',
};

// Logistics request type → label (Spanish)
export const REQUEST_TYPE_LABELS: Record<string, string> = {
  water_bottles: 'Botellones',
  fuel: 'Combustible',
  material: 'Materiales',
  vacuum: 'Vacuum',
};

// Logistics request status → label (Spanish)
export const REQUEST_STATUS_LABELS: Record<string, string> = {
  requested: 'Solicitado',
  pending: 'En espera',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

// Status → color hex
export const STATUS_COLOR_MAP: Record<string, string> = {
  requested: '#3b82f6',
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
};

/** Resolve hex from incident type color string */
export function getIncidentColor(color: string): string {
  return INCIDENT_COLOR_MAP[color] ?? '#6b7280';
}

/** Detect dark mode reactively via MutationObserver on <html> class */
function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(el.classList.contains('dark'));
    });
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

/** Axis tick color that respects dark mode reactively */
export function useAxisTickColor(): string {
  const isDark = useIsDarkMode();
  return isDark ? '#9ca3af' : '#6b7280';
}

/** Grid stroke color that respects dark mode reactively */
export function useGridStroke(): string {
  const isDark = useIsDarkMode();
  return isDark ? '#374151' : '#e5e7eb';
}
