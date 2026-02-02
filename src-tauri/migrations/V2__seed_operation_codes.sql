-- Seed standard IADC operation codes

-- Perforación (Drilling)
INSERT INTO operation_codes (id, code, name, category, sort_order, active, created_at) VALUES
  ('op_001', 'PERF', 'Perforación', 'Perforación', 1, 1, datetime('now')),
  ('op_002', 'RIM', 'Rimado', 'Perforación', 2, 1, datetime('now')),
  ('op_003', 'CORE', 'Corazonamiento', 'Perforación', 3, 1, datetime('now'));

-- Viajes (Trips)
INSERT INTO operation_codes (id, code, name, category, sort_order, active, created_at) VALUES
  ('op_004', 'TRIP_IN', 'Viaje Metiendo Tubería', 'Viajes', 10, 1, datetime('now')),
  ('op_005', 'TRIP_OUT', 'Viaje Sacando Tubería', 'Viajes', 11, 1, datetime('now')),
  ('op_006', 'SHORT_TRIP', 'Viaje Corto', 'Viajes', 12, 1, datetime('now'));

-- Casing y Cementación (Casing & Cementing)
INSERT INTO operation_codes (id, code, name, category, sort_order, active, created_at) VALUES
  ('op_007', 'RUN_CASING', 'Bajando Revestidor', 'Revestimiento', 20, 1, datetime('now')),
  ('op_008', 'CEMENT', 'Cementación', 'Revestimiento', 21, 1, datetime('now')),
  ('op_009', 'WOC', 'Esperando Fraguado de Cemento (WOC)', 'Revestimiento', 22, 1, datetime('now'));

-- Operaciones Especiales (Special Operations)
INSERT INTO operation_codes (id, code, name, category, sort_order, active, created_at) VALUES
  ('op_010', 'LOGGING', 'Registro Eléctrico', 'Registros', 30, 1, datetime('now')),
  ('op_011', 'SURVEY', 'Levantamiento Direccional', 'Registros', 31, 1, datetime('now')),
  ('op_012', 'BOP_TEST', 'Prueba de BOP', 'Seguridad', 32, 1, datetime('now'));

-- Conexiones y Mantenimiento (Connections & Maintenance)
INSERT INTO operation_codes (id, code, name, category, sort_order, active, created_at) VALUES
  ('op_013', 'CONNECTION', 'Conexión', 'Operaciones', 40, 1, datetime('now')),
  ('op_014', 'CIRCULATE', 'Circulación', 'Operaciones', 41, 1, datetime('now')),
  ('op_015', 'MUD_MIX', 'Mezclando Lodo', 'Operaciones', 42, 1, datetime('now'));

-- Problemas (Trouble Time)
INSERT INTO operation_codes (id, code, name, category, sort_order, active, created_at) VALUES
  ('op_016', 'STUCK_PIPE', 'Tubería Pegada', 'Problemas', 50, 1, datetime('now')),
  ('op_017', 'FISHING', 'Pesca', 'Problemas', 51, 1, datetime('now')),
  ('op_018', 'WASH_REAM', 'Lavado y Rimado', 'Problemas', 52, 1, datetime('now'));

-- Tiempos No Productivos (NPT - Non-Productive Time)
INSERT INTO operation_codes (id, code, name, category, sort_order, active, created_at) VALUES
  ('op_019', 'RIG_REPAIR', 'Reparación de Equipo', 'NPT', 60, 1, datetime('now')),
  ('op_020', 'WAIT_ORDER', 'Esperando Órdenes', 'NPT', 61, 1, datetime('now')),
  ('op_021', 'WAIT_WEATHER', 'Esperando Clima', 'NPT', 62, 1, datetime('now')),
  ('op_022', 'WAIT_MATERIAL', 'Esperando Material', 'NPT', 63, 1, datetime('now'));

-- Otros (Other)
INSERT INTO operation_codes (id, code, name, category, sort_order, active, created_at) VALUES
  ('op_023', 'MOVE_RIG', 'Moviendo Taladro', 'Otros', 70, 1, datetime('now')),
  ('op_024', 'RIG_UP', 'Instalación de Equipo', 'Otros', 71, 1, datetime('now')),
  ('op_025', 'RIG_DOWN', 'Desinstalación de Equipo', 'Otros', 72, 1, datetime('now'));
