import type { TFunction } from 'i18next';

// ── IncidentType ─────────────────────────────────────────────
// Seeded IDs are predictable (V32 migration), so we map by ID.

const INCIDENT_TYPE_KEYS: Record<string, string> = {
  type_safety: 'incidentTypes.safety',
  type_mechanical: 'incidentTypes.mechanical',
  type_operational: 'incidentTypes.operational',
  type_environmental: 'incidentTypes.environmental',
  type_hse: 'incidentTypes.hse',
  type_other: 'incidentTypes.other',
};

/**
 * Translate incident type name for known defaults; falls back to DB name for custom types.
 */
export function translateIncidentTypeName(
  id: string,
  dbName: string,
  t: TFunction,
): string {
  const key = INCIDENT_TYPE_KEYS[id];
  return key ? t(key) : dbName;
}

// ── CrewPosition ─────────────────────────────────────────────
// Seeded IDs are random UUIDs (V44 migration), so we map by Spanish name.

const CREW_POSITION_KEYS: Record<string, string> = {
  Perforador: 'crewPositions.driller',
  Encuellador: 'crewPositions.derrickman',
  'Cuñero': 'crewPositions.floorman',
  Arenillero: 'crewPositions.roustabout',
  'Mecánico': 'crewPositions.mechanic',
  Soldador: 'crewPositions.welder',
  'Operador Montacargas': 'crewPositions.forkliftOperator',
  Obrero: 'crewPositions.laborer',
  Supervisor: 'crewPositions.supervisor',
  Otro: 'crewPositions.other',
};

/**
 * Translate crew position name for known defaults; falls back to DB name for custom positions.
 */
export function translateCrewPositionName(
  dbName: string,
  t: TFunction,
): string {
  const key = CREW_POSITION_KEYS[dbName];
  return key ? t(key) : dbName;
}
