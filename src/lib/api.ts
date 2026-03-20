/**
 * @deprecated Este archivo existe solo para compatibilidad con imports legacy.
 * Usa '@/lib/api' que resuelve al directorio api/index.ts
 *
 * El API client está dividido por dominio en src/lib/api/:
 *   auth.ts · users.ts · reports.ts · rigs.ts · companies.ts
 *   logistics.ts · incidents.ts · admin.ts · notifications.ts
 *   preferences.ts · sync.ts · license.ts · cloudLogs.ts
 */
export * from './api/index';

// ---- contenido legacy eliminado — ver src/lib/api/ ----
// Este bloque vacío hace que TypeScript no reporte "file has no exports"
