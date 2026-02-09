# Aplicación Tauri - Gestión de Operaciones de Taladros Petroleros

## Resumen

Aplicación de escritorio con Tauri + React + TypeScript para gestionar reportes diarios de operaciones (DDR/IADC) de taladros petroleros, con sistema de roles y funcionamiento híbrido (offline/online).

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                    TAURI APP                            │
├─────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript + TailwindCSS)            │
│  ├── Páginas: Login, Dashboard, Reportes, Admin         │
│  ├── Componentes: Formularios DDR, Tablas, Navegación   │
│  └── Estado: Zustand + React Query                      │
├─────────────────────────────────────────────────────────┤
│  Backend (Rust - Tauri Core)                            │
│  ├── Comandos Tauri (API interna)                       │
│  ├── SQLite (almacenamiento local)                      │
│  └── Sincronización con servidor remoto                 │
└─────────────────────────────────────────────────────────┘
```

---

## Estructura del Proyecto

```
planner/
├── src-tauri/                    # Backend Rust
│   ├── src/
│   │   ├── main.rs               # Entry point
│   │   ├── commands/             # Comandos Tauri
│   │   │   ├── mod.rs
│   │   │   ├── auth.rs           # Autenticación
│   │   │   ├── reports.rs        # CRUD reportes
│   │   │   └── sync.rs           # Sincronización
│   │   ├── db/                   # Base de datos
│   │   │   ├── mod.rs
│   │   │   ├── schema.rs         # Esquema SQLite
│   │   │   └── migrations/
│   │   └── models/               # Estructuras de datos
│   │       ├── mod.rs
│   │       ├── user.rs
│   │       └── report.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                          # Frontend React
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Router principal
│   ├── components/
│   │   ├── ui/                   # Componentes base
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Table.tsx
│   │   │   └── Modal.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MainLayout.tsx
│   │   └── forms/                # Secciones del DDR
│   │       ├── HeaderSection.tsx
│   │       ├── CrewSection.tsx
│   │       ├── TimeDistribution.tsx
│   │       ├── BitRecord.tsx
│   │       ├── MudRecord.tsx
│   │       ├── LithologySection.tsx
│   │       └── DeviationHistory.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ReportForm.tsx        # Formulario DDR principal
│   │   ├── ReportList.tsx
│   │   ├── ReportView.tsx
│   │   └── admin/
│   │       ├── Users.tsx
│   │       └── Settings.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useReports.ts
│   │   └── useSync.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   └── reportStore.ts
│   ├── types/
│   │   ├── report.ts             # Tipos del DDR
│   │   └── user.ts
│   ├── lib/
│   │   ├── tauri.ts              # Wrapper comandos Tauri
│   │   └── utils.ts
│   └── styles/
│       └── globals.css
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── index.html
```

---

## Modelo de Datos (basado en el macroformato IADC)

### Tabla: `users`

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  ci TEXT,                        -- Cédula de identidad
  role TEXT CHECK(role IN ('operator', 'supervisor', 'admin')) NOT NULL,
  position TEXT,                  -- Cargo (Perforador, Cuñero, etc.)
  active INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);
```

### Tabla: `reports` (Encabezado del DDR)

```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  report_number INTEGER NOT NULL,
  report_date TEXT NOT NULL,
  well_number TEXT,
  api_number TEXT,
  contract TEXT,
  contractor TEXT,
  operator TEXT,
  field_district TEXT,            -- Campo o Distrito
  municipality TEXT,
  rig_number TEXT,                -- TAL N°
  supervisor_24h TEXT,
  status TEXT CHECK(status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
  created_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  created_at TEXT,
  updated_at TEXT,
  synced INTEGER DEFAULT 0
);
```

### Tabla: `drill_string` (Datos de Sarta)

```sql
CREATE TABLE drill_string (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id),
  size TEXT,
  weight TEXT,
  grade TEXT,
  connection_type TEXT,           -- Tipo de rosca
  string_number TEXT,             -- Sarta N°
  pump_brand TEXT,
  pump_type TEXT,
  header_length TEXT
);
```

### Tabla: `crew_shifts` (Cuadrilla por Turno)

```sql
CREATE TABLE crew_shifts (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id),
  shift TEXT CHECK(shift IN ('morning', 'afternoon', 'night')) NOT NULL,
  shift_start TEXT,
  shift_end TEXT
);

CREATE TABLE crew_members (
  id TEXT PRIMARY KEY,
  crew_shift_id TEXT REFERENCES crew_shifts(id),
  position TEXT NOT NULL,         -- Perforador, Cuñero, Arenillero, etc.
  ci TEXT,
  name TEXT,
  hours REAL
);
```

### Tabla: `operation_codes` (Códigos de Operación - Configurables)

```sql
CREATE TABLE operation_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,      -- Código corto (ej: "PERF", "RIM")
  name TEXT NOT NULL,             -- Nombre completo
  category TEXT,                  -- Categoría (Perforación, Viajes, etc.)
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT
);
```

### Tabla: `time_distribution` (Distribución de Tiempo)

```sql
CREATE TABLE time_distribution (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id),
  operation_code_id TEXT REFERENCES operation_codes(id),
  hours_shift1 REAL DEFAULT 0,    -- Turno mañana
  hours_shift2 REAL DEFAULT 0,    -- Turno tarde
  hours_shift3 REAL DEFAULT 0     -- Turno noche
);
```

### Tabla: `bit_records` (Record de Mechas)

```sql
CREATE TABLE bit_records (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id),
  shift TEXT,
  size TEXT,
  manufacturer_code TEXT,
  brand TEXT,
  bit_type TEXT,
  serial_number TEXT,
  jets TEXT,                      -- Chorros
  tfa TEXT,
  depth_out TEXT,                 -- Prof. Sacada
  depth_in TEXT,                  -- Prof. Metida
  footage TEXT,                   -- Perf. Total
  hours_total REAL,
  dp_tubos TEXT,
  kelly TEXT
);
```

### Tabla: `mud_records` (Record de Lodo)

```sql
CREATE TABLE mud_records (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id),
  shift TEXT,
  hour TEXT,
  weight TEXT,                    -- Peso
  viscosity TEXT,                 -- Visc. Seg.
  pvp TEXT,
  gels TEXT,
  filtrate TEXT,                  -- Filtro API 30
  ph TEXT,
  solids TEXT                     -- Sólidos %
);
```

### Tabla: `mud_additives` (Barro y Químicos)

```sql
CREATE TABLE mud_additives (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id),
  shift TEXT,
  additive_type TEXT,
  quantity TEXT
);
```

### Tabla: `drilling_parameters` (Parámetros de Perforación)

```sql
CREATE TABLE drilling_parameters (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id),
  shift TEXT,
  depth_from TEXT,
  depth_to TEXT,
  core_number TEXT,
  rotary_rpm TEXT,
  bit_weight TEXT,
  pump_pressure TEXT,
  pump_number TEXT,
  pump_liner TEXT,
  pump_spm TEXT,
  total_gpm TEXT,
  method_used TEXT,
  lithology_notes TEXT
);
```

### Tabla: `deviation_history` (Historial de Desviación)

```sql
CREATE TABLE deviation_history (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id),
  depth TEXT,
  deviation TEXT,
  direction TEXT,
  tvo TEXT,
  horizontal_displacement TEXT
);
```

### Tabla: `operations_log` (Detalles de Operación)

```sql
CREATE TABLE operations_log (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id),
  shift TEXT,
  time_from TEXT,
  time_to TEXT,
  duration TEXT,
  operation_code TEXT,
  details TEXT
);
```

---

## Sistema de Roles y Permisos

| Permiso                  | Operador | Supervisor | Admin |
|--------------------------|----------|------------|-------|
| Ver reportes propios     | ✓        | ✓          | ✓     |
| Crear reportes           | ✓        | ✓          | ✓     |
| Editar reportes propios  | ✓        | ✓          | ✓     |
| Ver todos los reportes   | ✗        | ✓          | ✓     |
| Editar cualquier reporte | ✗        | ✓          | ✓     |
| Aprobar reportes         | ✗        | ✓          | ✓     |
| Gestionar usuarios       | ✗        | ✗          | ✓     |
| Configuración sistema    | ✗        | ✗          | ✓     |
| Exportar datos           | ✗        | ✓          | ✓     |

---

## Diseño de UI/UX

### Paleta de Colores (Tema Petrolero Moderno)

- **Primario**: #1E3A5F (Azul petróleo oscuro)
- **Secundario**: #F97316 (Naranja energía)
- **Fondo**: #F8FAFC (Gris muy claro)
- **Superficie**: #FFFFFF
- **Texto**: #1E293B
- **Éxito**: #22C55E
- **Error**: #EF4444

### Layout Principal

```
┌──────────────────────────────────────────────────────────┐
│  Header: Logo | Pozo Actual | Usuario | Notificaciones   │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│ Sidebar  │              Contenido Principal              │
│          │                                               │
│ - Home   │  ┌─────────────────────────────────────────┐  │
│ - Nuevo  │  │  Formulario DDR dividido en tabs:       │  │
│ - Lista  │  │  [Encabezado][Cuadrilla][Tiempos]       │  │
│ - (Admin)│  │  [Mechas][Lodo][Litología][Observ.]     │  │
│          │  └─────────────────────────────────────────┘  │
│          │                                               │
└──────────┴───────────────────────────────────────────────┘
```

### Formulario DDR en Tabs

El formulario estará dividido en 7 pestañas para facilitar la entrada de datos:

1. **Encabezado**: Datos generales del reporte y pozo
2. **Cuadrilla**: Personal por turno (mañana/tarde/noche)
3. **Tiempos**: Distribución de tiempo por operación
4. **Mechas**: Record de brocas por turno
5. **Lodo**: Propiedades y aditivos del lodo
6. **Litología**: Parámetros de perforación y desviación
7. **Observaciones**: Notas y detalles de operación

---

## Fases de Implementación

### Fase 1: Setup del Proyecto ✅
1. Inicializar proyecto Tauri con React + TypeScript
2. Configurar TailwindCSS
3. Configurar estructura de carpetas
4. Configurar SQLite con diesel/sqlx

### Fase 2: Backend Rust
1. Crear esquema de base de datos
2. Implementar migraciones
3. Crear comandos Tauri para CRUD
4. Implementar autenticación local

### Fase 3: Frontend Base
1. Crear componentes UI base
2. Implementar layout principal
3. Crear sistema de rutas
4. Implementar store (Zustand)

### Fase 4: Módulo de Autenticación
1. Página de login
2. Gestión de sesiones
3. Guards de rutas por rol

### Fase 5: Formulario DDR
1. Implementar cada sección como componente
2. Crear sistema de tabs
3. Validación de datos
4. Auto-guardado local

### Fase 6: Listado y Visualización
1. Lista de reportes con filtros
2. Vista detalle del reporte
3. Exportación a PDF

### Fase 7: Panel de Administración
1. Gestión de usuarios
2. Gestión de códigos de operación (CRUD configurable)
3. Configuraciones del sistema

### Fase 8: Exportación
1. Generación de PDF (formato IADC original)
2. Exportación a Excel (.xlsx)
3. Vista previa antes de exportar

### Fase 9: Sincronización (Fase futura)
1. API REST en servidor
2. Sistema de cola de sincronización
3. Resolución de conflictos

---

## Tecnologías y Dependencias

### Frontend (package.json)

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.0",
    "react": "^18.2",
    "react-dom": "^18.2",
    "react-router-dom": "^6.20",
    "zustand": "^4.4",
    "@tanstack/react-query": "^5.0",
    "react-hook-form": "^7.48",
    "zod": "^3.22",
    "@hookform/resolvers": "^3.3",
    "date-fns": "^2.30",
    "lucide-react": "^0.294"
  },
  "devDependencies": {
    "typescript": "^5.3",
    "vite": "^5.0",
    "@vitejs/plugin-react": "^4.2",
    "tailwindcss": "^3.3",
    "autoprefixer": "^10.4",
    "postcss": "^8.4",
    "@react-pdf/renderer": "^3.1",
    "xlsx": "^0.18"
  }
}
```

### Backend (Cargo.toml)

```toml
[dependencies]
tauri = { version = "2.0", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
rusqlite = { version = "0.31", features = ["bundled"] }
bcrypt = "0.15"
uuid = { version = "1.6", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
```

---

## Verificación

1. **Build**: `npm run tauri build` debe compilar sin errores
2. **Login**: Probar autenticación con cada rol
3. **CRUD**: Crear, editar, ver y eliminar reportes
4. **Validación**: Verificar que campos requeridos se validen
5. **Permisos**: Confirmar que cada rol solo accede a lo permitido
6. **Persistencia**: Cerrar y abrir app, datos deben persistir

---

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run tauri dev

# Compilar para producción
npm run tauri build
```

---

## Licencia

Proyecto privado - Todos los derechos reservados.
