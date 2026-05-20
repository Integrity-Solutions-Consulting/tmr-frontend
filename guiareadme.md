# 📋 SGP — Especificación Frontend: Módulo Time Report (Actividades & Seguimiento)

> **Stack:** Angular (standalone) · Angular Material · SCSS · TypeScript  
> **Sin backend.** Todo funciona con mock data local.  
> **Tipografía:** Inter · **Paleta primaria:** `#163572` / `#162056` / `#F5F5F5`

---

## 1. Visión General

Se construirá el frontend completo del módulo **Time Report** del sistema SGP (Integrity Solutions), compuesto por dos sub-módulos:

| Sub-módulo | Ruta | Descripción |
|---|---|---|
| **Actividades** | `/time-report/actividades` | Calendario mensual de horas por colaborador |
| **Seguimiento** | `/time-report/seguimiento` | Tabla de control de horas por colaborador/proyecto |

El diseño replica **fielmente** las imágenes de referencia: mismos colores, distribución, espaciados, tipografía, bordes y estilo corporativo/enterprise.

---

## 2. Estructura de Carpetas

```
src/
├── app/
│   ├── core/                          ← Layout global
│   │   ├── layout/
│   │   │   ├── layout.component.ts
│   │   │   ├── layout.component.html
│   │   │   └── layout.component.scss
│   │   ├── navbar/
│   │   │   ├── navbar.component.ts
│   │   │   ├── navbar.component.html
│   │   │   └── navbar.component.scss
│   │   └── sidebar/
│   │       ├── sidebar.component.ts
│   │       ├── sidebar.component.html
│   │       └── sidebar.component.scss
│   │
│   ├── shared/
│   │   ├── models/
│   │   │   ├── actividad.model.ts
│   │   │   ├── colaborador.model.ts
│   │   │   ├── proyecto.model.ts
│   │   │   └── seguimiento.model.ts
│   │   ├── services/
│   │   │   ├── actividades.service.ts
│   │   │   ├── seguimiento.service.ts
│   │   │   └── feriados.service.ts
│   │   └── pipes/
│   │       └── horas-format.pipe.ts
│   │
│   ├── features/
│   │   └── time-report/
│   │       ├── time-report.routes.ts
│   │       ├── actividades/
│   │       │   ├── actividades.component.ts
│   │       │   ├── actividades.component.html
│   │       │   ├── actividades.component.scss
│   │       │   ├── calendario/
│   │       │   │   ├── calendario.component.ts
│   │       │   │   ├── calendario.component.html
│   │       │   │   └── calendario.component.scss
│   │       │   ├── agregar-actividad/
│   │       │   │   ├── agregar-actividad.component.ts   ← Dialog modal
│   │       │   │   ├── agregar-actividad.component.html
│   │       │   │   └── agregar-actividad.component.scss
│   │       │   └── generar-reporte/
│   │       │       ├── generar-reporte.component.ts    ← Dialog modal
│   │       │       ├── generar-reporte.component.html
│   │       │       └── generar-reporte.component.scss
│   │       └── seguimiento/
│   │           ├── seguimiento.component.ts
│   │           ├── seguimiento.component.html
│   │           └── seguimiento.component.scss
│   │
│   ├── app.routes.ts
│   ├── app.component.ts
│   └── app.config.ts
│
├── assets/
│   └── logo/
│       └── integrity-logo.svg
└── styles/
    ├── _variables.scss
    ├── _typography.scss
    ├── _material-theme.scss
    └── styles.scss
```

---

## 3. Arquitectura y Tecnología

### 3.1 Angular Material + SCSS (sin Tailwind)

- Todos los componentes usan **Angular Material** para: selects, datepickers, checkboxes, dialogs, tables, paginators, inputs.
- Los estilos se extienden/sobreescriben vía SCSS para que el resultado visual coincida exactamente con las imágenes.
- **No se usa Tailwind.**

### 3.2 Componentes Standalone

Todos los componentes son `standalone: true`. Se importan individualmente los módulos de Angular Material necesarios.

### 3.3 Mock Services

Dos servicios principales con `BehaviorSubject` para estado reactivo:
- `ActividadesService` — CRUD de actividades en memoria.
- `SeguimientoService` — Lista de colaboradores/seguimiento en memoria.
- `FeriadosService` — Listado estático de feriados nacionales Ecuador 2026.

---

## 4. Modelos e Interfaces

```typescript
// actividad.model.ts
export interface Actividad {
  id: string;
  tipoActividad: 'Desarrollo' | 'Diseño' | 'Reunión' | 'Testing' | 'Otro';
  proyectoId: string;
  proyectoNombre: string;
  codigoRequerimiento: string;
  descripcion?: string;
  fechaActividad: Date;
  numeroHoras: number;
  esRecurrente: boolean;
  // Solo si esRecurrente = true
  fechaInicio?: Date;
  fechaFin?: Date;
  horasPorDia?: number;
  incluirFinesDeSemana?: boolean;
  incluirFeriados?: boolean;
}

// colaborador.model.ts
export interface Colaborador {
  id: string;
  nombre: string;
  proyecto: string;
  cliente: string;
  liderTecnico: string;
  nroHoras: number;
  estado: 'Completo' | 'En progreso' | 'Pendiente';
  diasConReporte: number;
  diasACompletar: number;
}

// seguimiento.model.ts
export interface SeguimientoFiltros {
  busqueda: string;
  clienteId: string;
  fechaDesde: Date | null;
  fechaHasta: Date | null;
  periodo: 'quincena' | 'mes-completo';
}
```

---

## 5. Mock Data

### 5.1 Actividades (mock)

El servicio `ActividadesService` parte de un array inicial con actividades pre-cargadas para que el calendario no esté vacío. Incluye actividades en varios días del mes actual.

### 5.2 Seguimiento (mock)

El servicio `SeguimientoService` contiene 15+ colaboradores como los que aparecen en la imagen:

- Daniel Francisco Caisaguano Sanchez — Middleware Fábrica de software — En progreso
- Dylan Alejandro Beltran Tovar — Accesos Fábrica de software — En progreso
- Michelle Allison Vargas Orozco — Proyecto Omnicanalidad — Completo
- Akira Mahilyn Aguirre Lugo — Accesos Fábrica de software — Completo
- Angel Enrique Vivanco García — NAOS / Time Report / Bolsa de empleo — Completo
- Bryan Estiven Silva Mercado — Arquitectura Fábrica de software — Completo
- Carlos Eduardo Solorzano Zavala — Middleware Fábrica de software — Completo
- Edwin Saul Falcones Franco — NAOS — Completo
- *(y más para probar paginador)*

### 5.3 Feriados Ecuador 2026

```typescript
export const FERIADOS_2026: Date[] = [
  new Date(2026, 0, 1),   // Año Nuevo
  new Date(2026, 1, 16),  // Carnaval
  new Date(2026, 1, 17),  // Carnaval
  new Date(2026, 4, 25),  // Día del Trabajo (trasladado)
  new Date(2026, 4, 25),  // Batalla del Pichincha (trasladado)
  new Date(2026, 7, 10),  // Primer Grito de Independencia
  new Date(2026, 9, 9),   // Independencia de Guayaquil
  new Date(2026, 10, 2),  // Día de los Difuntos
  new Date(2026, 10, 3),  // Independencia de Cuenca
  new Date(2026, 11, 25), // Navidad
];
```

---

## 6. Módulo: Core (Layout, Navbar, Sidebar)

### 6.1 Layout

`LayoutComponent` actúa como shell del app:

```
┌──────────────────────────────────────────────┐
│  NAVBAR (top, 60px)                          │
├─────────────┬────────────────────────────────┤
│  SIDEBAR    │   <router-outlet>              │
│  (220px)    │   Contenido del módulo         │
└─────────────┴────────────────────────────────┘
```

### 6.2 Navbar

- Logo Integrity Solutions (izquierda)
- Texto "SGP." junto al logo
- Icono de usuario / nombre del usuario autenticado (derecha)
- Color de fondo: `#162056`
- Tipografía blanca, Inter

### 6.3 Sidebar

Items del menú (según imagen):

| Icono | Label | Ruta |
|---|---|---|
| dashboard | Dashboard | `/dashboard` |
| folder | Proyectos | `/proyectos` |
| schedule | Time Report *(con chevron)* | Expandible |
| → briefcase | Actividades | `/time-report/actividades` |
| → build | Seguimiento | `/time-report/seguimiento` |
| group | Colaboradores | `/colaboradores` |
| person | Clientes | `/clientes` |
| star | Líderes | `/lideres` |
| settings | Configuración *(con chevron)* | Expandible |
| bar_chart | Reportes *(con chevron)* | Expandible |

- Item activo: highlight azul `#163572` con fondo `rgba(22,53,114,0.1)`
- Fondo sidebar: blanco con borde derecho `1px solid #E0E0E0`
- El ítem **Time Report** se expande mostrando Actividades y Seguimiento con indentación

---

## 7. Módulo: Actividades

### 7.1 Vista General

```
┌──────────────────────────────────────────────────────────────────────┐
│  Time Report                        [⏱ Horas Registradas: X.XX h]  [Agregar Actividad +] │
├──────────────────────────────────────────────────────────────────────┤
│  [<] [>] [Hoy]        mayo de 2026 ∨         ● Con horas  ◑ Parcial  ○ Sin horas         │
├───────────┬────────────┬────────────┬─────────┬──────────┬──────────┬──────────┤
│   dom     │    lun     │    mar     │   mié   │   jue    │   vie    │   sáb    │
│  (color   │            │            │         │          │          │  (color  │
│ fin sem)  │            │            │         │          │          │ fin sem) │
│  ...      │  ...       │  ...       │  ...    │  ...     │  ...     │  ...     │
├──────────────────────────────────────────────────────────────────────────────────┤
│ [⏱ Horas por registrar X.XX h]  [✓ Horas registradas X.XX h]  [📅 Horas semana X.XX h]  [📊 Horas mes X.XX h]  [Generar Reporte] │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Calendario

#### Tipos de celda (colores diferenciados)

| Tipo | Color de fondo | Descripción |
|---|---|---|
| Día normal sin horas | `#EEF3FB` (azul muy claro) | Días laborables sin actividades |
| Fin de semana | `#F5F5F5` (gris claro) | Sábado y domingo |
| Día actual | `#FFF9E6` (amarillo suave) | El día de hoy |
| Feriado | `#FFF3F3` (rojo muy claro) | Días feriados nacionales Ecuador 2026 |
| Con horas (completo) | Indicador azul `●` | Celda con horas == horas esperadas |
| Parcial | Indicador amarillo `◑` | Celda con horas > 0 pero < esperadas |
| Sin horas | Sin indicador / gris | 0 horas |

#### Funcionalidad de navegación mensual

- **Botón `<` (chevron izquierdo):** Retrocede al mes anterior. El calendario se regenera con los días del nuevo mes.
- **Botón `>` (chevron derecho):** Avanza al mes siguiente.
- **Botón `Hoy`:** Retorna al mes actual y resalta el día actual.
- **Dropdown del mes:** Selector para saltar a cualquier mes del año.

#### Celda del calendario

Cada celda muestra:
- Número de día (esquina superior derecha)
- Total de horas registradas ese día (ej: `2.50 h`)
- Color de fondo según tipo de día
- Al hacer **clic en una celda vacía o con horas:** se abre el modal **Agregar Actividad** con la fecha pre-rellenada

#### Leyenda

Ubicada en la parte superior derecha del calendario:
- `● Con horas` — azul
- `◑ Parcial` — amarillo
- `○ Sin horas` — gris

### 7.3 Modal: Agregar Actividad

Abre mediante `MatDialog`. Se puede disparar desde:
1. Botón **"Agregar Actividad +"** (header)
2. Clic en cualquier celda del calendario

#### Campos del formulario (Reactive Form con validaciones)

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| Tipo de Actividad | `MatSelect` dropdown | ✅ | Opciones: Desarrollo, Diseño, Reunión, Testing, Otro |
| Proyecto | `MatSelect` dropdown | ✅ | Cargado desde mock data |
| Código de Requerimiento | `MatInput` text | ✅ | Máx 50 caracteres, contador visible |
| Descripción | `MatTextarea` | ❌ | Máx 350 caracteres, contador visible |
| Fecha Actividad | `MatDatepicker` | ✅ | Si se abrió desde celda, se pre-rellena |
| Número de Horas | `MatInput` number | ✅ | Mínimo 0.5, máximo 24 |
| Actividad Recurrente | `MatCheckbox` | — | Toggle que muestra/oculta sección recurrente |

#### Sección Actividad Recurrente (visible solo si checkbox activo)

| Campo | Tipo | Requerido |
|---|---|---|
| Fecha Inicio | `MatDatepicker` | ✅ |
| Fecha Fin | `MatDatepicker` | ✅ |
| Horas por día | `MatInput` number | ✅ |
| Incluir fines de semana | `MatCheckbox` | — |
| Incluir días feriados | `MatCheckbox` | — |

**Preview dinámico:** Texto en verde que indica cuántas actividades se crearán. Ej: `"Se crearán 5 actividades entre 13/05/2026 y 19/05/2026"`.  
Este cálculo es reactivo: cambia automáticamente cuando se modifican las fechas o los checkboxes de fines de semana/feriados.

**Botones:**
- `Agregar` (azul `#163572`) — valida el formulario, guarda en el servicio, cierra el modal, actualiza el calendario y los indicadores.
- `Cancelar` — cierra sin guardar.

### 7.4 Modal: Generar Reporte

Abre mediante `MatDialog` desde el botón **"Generar Reporte"** en el footer del calendario.

#### Campos

| Campo | Tipo | Notas |
|---|---|---|
| Empleado | Texto fijo | Muestra nombre del usuario actual (mock) |
| Cliente | `MatSelect` dropdown | Lista de clientes del mock |
| Año | `MatSelect` dropdown | Años disponibles (2024, 2025, 2026) |
| Mes | `MatSelect` dropdown | Enero — Diciembre |

**Botones:**
- `Generar` — genera y descarga un archivo `.xlsx` con las actividades del período seleccionado usando la librería `xlsx` (SheetJS). Columnas: Fecha, Tipo, Proyecto, Código, Descripción, Horas.
- `Cancelar` — cierra el modal.

### 7.5 Footer de Métricas (reactivo)

Calculado automáticamente desde el `ActividadesService`, usando `computed signals` o `combineLatest`. Se actualiza cada vez que se agrega, edita o elimina una actividad.

| Métrica | Descripción | Icono |
|---|---|---|
| **Horas por registrar** | Horas del día actual aún no "confirmadas" | `⏱` schedule |
| **Horas registradas** | Total de horas del día actual | `✓` check_circle |
| **Horas de la semana** | Total acumulado semana en curso | `📅` calendar_today |
| **Horas del mes** | Total acumulado mes en curso | `📊` bar_chart |

**Nunca se hardcodean en el HTML.** Se enlazan vía `{{ metric.value | number:'1.2-2' }}`.

---

## 8. Módulo: Seguimiento

### 8.1 Vista General

```
┌──────────────────────────────────────────────────────────────────────┐
│  Seguimiento                                    [⏱ Horas: 96.50 h] [⬇ Reporte ∨] │
├──────────────────────────────────────────────────────────────────────┤
│  [🔍 Buscar colaborador, proyecto, cliente...]  [Cliente ∨]  [Fecha desde 📅] [Fecha hasta 📅]  Período: [Quincena] [✓ Mes Completo]  [✓ Aprobar] │
├──────────────────────────────────────────────────────────────────────┤
│ ☐ | Colaborador | Proyecto | Cliente | Líder Técnico | Nro Horas | Estado | Días con Reporte | Días a Completar | Acciones │
│ ☐ | Daniel F... | Middleware... | BANCO DEL PACÍFICO | Elba Basurto | 96.00h | 🟡 En progreso | 12 | 8 | ⋮ │
│ ... │
├──────────────────────────────────────────────────────────────────────┤
│ [⏱ X h pendientes] [✓ X h registradas] [📅 X.XX h/día promedio] [👥 X colaboradores] [📂 X proyectos] │
│                                                        [◁ 1 2 3 ▷ Paginador] │
└──────────────────────────────────────────────────────────────────────┘
```

### 8.2 Filtros

#### Búsqueda de texto libre

- `MatFormField` con icono de lupa
- Placeholder: `"Buscar colaborador, proyecto, cliente..."`
- Filtra en tiempo real sobre los campos: `nombre`, `proyecto`, `cliente`
- Usa `debounceTime(300)` para no disparar en cada keystroke

#### Combobox de Clientes

- `MatSelect` con opción vacía ("Todos los clientes")
- Lista de clientes cargada desde mock: Banco del Pacífico, Banco Bolivariano, Integrity Solutions, etc.
- Al seleccionar un cliente, filtra la tabla mostrando solo sus colaboradores

#### Fecha Desde / Fecha Hasta

- Dos `MatDatepicker` enlazados
- Fecha Hasta no puede ser anterior a Fecha Desde (validación cross-field)
- Filtran los registros según el rango de fechas de actividad

#### Período: Quincena / Mes Completo

- Dos botones tipo **toggle group** (estilo pill/chip):
  - `Quincena` → días 1-15 del mes
  - `Mes Completo` → todos los días del mes
- **El período sincroniza las columnas "Días con Reporte" y "Días a Completar":**
  - `Días con Reporte` = días dentro del período que tienen al menos 1 actividad registrada
  - `Días a Completar` = días laborables del período sin actividades
- Solo uno puede estar activo a la vez
- Visualmente: el seleccionado tiene fondo azul con checkmark (como en la imagen)

#### Botón Aprobar

- Botón verde `Aprobar` (con ícono de check)
- Activo solo cuando hay registros seleccionados (checkbox de fila activado)
- Cambia el estado de los seleccionados a "Completo" (en mock)

### 8.3 Tabla de Seguimiento

Usa `MatTable` con `MatSort` y `MatPaginator`.

#### Columnas

| Columna | Descripción |
|---|---|
| Checkbox | Selección individual / seleccionar todo (`MatCheckbox` en header) |
| **Colaborador** | Nombre completo en negrita |
| **Proyecto** | Nombre(s) del proyecto, pueden ser múltiples |
| **Cliente** | Nombre del cliente |
| **Líder Técnico** | Nombre(s) del líder, pueden ser múltiples |
| **Nro de Horas** | Total de horas del período (`XXX.XX h`) |
| **Estado** | Badge con color: 🟡 `En progreso` / 🟢 `Completo` / 🔴 `Pendiente` |
| **Días con Reporte** | Número de días reportados en el período |
| **Días a Completar** | Días laborables sin actividad en el período |
| **Acciones** | Botón `⋮` (three dots menu) |

#### Columna Acciones (Menú contextual)

Al hacer clic en `⋮`, abre un `MatMenu` con:
- **Descargar detalle** → genera y descarga un archivo `.xlsx` con el detalle de actividades de ese colaborador en el período. Columnas: Fecha, Proyecto, Tipo, Código, Descripción, Horas.
- **Ver detalle** → (navegación a vista detalle, mock por ahora)

### 8.4 Footer de Métricas (reactivo)

Calculado dinámicamente aplicando los filtros activos sobre el mock data.

| Métrica | Descripción | Icono |
|---|---|---|
| **Horas por registrar** | Horas pendientes de los colaboradores filtrados | `⏱` |
| **Horas registradas** | Total de horas del período filtrado | `✓` |
| **Promedio por día** | Total horas / días laborables del período | `📅` |
| **Colaboradores activos** | Cantidad de colaboradores con actividad en el período | `👥` |
| **Proyectos** | Cantidad de proyectos únicos | `📂` |

**Nunca hardcodeados en HTML.**

### 8.5 Paginador

- `MatPaginator` en el footer de la tabla
- Opciones: 5, 10, 25 registros por página
- Permite navegar sin usar scroll

### 8.6 Botón Reporte (header)

- Botón azul `⬇ Reporte ∨` con dropdown:
  - **Exportar Excel (.xlsx)** — exporta todos los registros filtrados con SheetJS
  - **Exportar CSV** — exporta en formato CSV plano
- El archivo incluye todas las columnas de la tabla más detalles adicionales

---

## 9. Estilos Globales y Design System

### 9.1 Variables SCSS

```scss
// _variables.scss
$primary:        #163572;
$primary-dark:   #162056;
$primary-light:  rgba(22, 53, 114, 0.08);
$secondary:      #F5F5F5;
$accent:         #4CAF50;   // Verde para "Completo"
$warn:           #FF9800;   // Amarillo para "En progreso"
$error:          #F44336;
$text-primary:   #1A1A2E;
$text-secondary: #6B7280;
$border-color:   #E5E7EB;
$white:          #FFFFFF;

$sidebar-width:  220px;
$navbar-height:  60px;
$border-radius:  8px;
$shadow-card:    0 2px 8px rgba(0, 0, 0, 0.08);
```

### 9.2 Tema Angular Material

Se configura un tema custom de Angular Material usando `mat.define-theme()` con la paleta basada en `#163572`.

```scss
// _material-theme.scss
@use '@angular/material' as mat;

$sgp-theme: mat.define-theme((
  color: (
    theme-type: light,
    primary: mat.$blue-palette,
  ),
  typography: (
    brand-family: 'Inter, sans-serif',
    plain-family: 'Inter, sans-serif',
  )
));
```

### 9.3 Colores del Calendario

```scss
// Tipos de celda
.calendar-cell--weekend   { background: #F8F9FA; }
.calendar-cell--holiday   { background: #FFF0F0; border-left: 3px solid #F44336; }
.calendar-cell--today     { background: #FFF9E6; border: 2px solid #F59E0B; }
.calendar-cell--with-hours { /* indicador azul ● */ }
.calendar-cell--partial   { /* indicador amarillo ◑ */ }
.calendar-cell--empty     { background: #EEF3FB; }
```

### 9.4 Tipografía

```html
<!-- index.html -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```scss
body { font-family: 'Inter', sans-serif; }
```

---

## 10. Librería de Exportación

Para la generación de archivos `.xlsx`, usar **SheetJS (xlsx)**:

```bash
npm install xlsx
```

```typescript
import * as XLSX from 'xlsx';

exportToExcel(data: any[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
```

---

## 11. Routing

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: 'time-report/actividades', pathMatch: 'full' },
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'time-report',
        loadChildren: () => import('./features/time-report/time-report.routes')
          .then(m => m.TIME_REPORT_ROUTES)
      }
    ]
  }
];

// time-report.routes.ts
export const TIME_REPORT_ROUTES: Routes = [
  { path: 'actividades', component: ActividadesComponent },
  { path: 'seguimiento', component: SeguimientoComponent },
  { path: '', redirectTo: 'actividades', pathMatch: 'full' }
];
```

---

## 12. Servicios Reactivos

### ActividadesService

```typescript
@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private actividades = signal<Actividad[]>(MOCK_ACTIVIDADES);

  // Computed signals
  horasDia = computed(() => /* suma horas del día actual */);
  horasSemana = computed(() => /* suma horas de la semana actual */);
  horasMes = computed(() => /* suma horas del mes actual */);
  horasPorRegistrar = computed(() => /* horas objetivo - horas registradas del día */);

  getActividadesPorFecha(fecha: Date): Actividad[] { ... }
  agregar(actividad: Actividad | Actividad[]): void { ... }
  eliminar(id: string): void { ... }
}
```

### SeguimientoService

```typescript
@Injectable({ providedIn: 'root' })
export class SeguimientoService {
  private colaboradores = signal<Colaborador[]>(MOCK_COLABORADORES);

  filtrar(filtros: SeguimientoFiltros): Colaborador[] { ... }
  getMetricas(filtros: SeguimientoFiltros): MetricasSeguimiento { ... }
  calcularDiasConReporte(colaboradorId: string, periodo: 'quincena'|'mes-completo'): number { ... }
  calcularDiasACompletar(colaboradorId: string, periodo: 'quincena'|'mes-completo'): number { ... }
}
```

---

## 13. Preparación para Backend

Todos los servicios se estructuran para que sea **trivial conectar el backend después**:

1. Los métodos del servicio tienen las mismas firmas que tendrían con HTTP.
2. Se puede reemplazar el `signal(MOCK_DATA)` por `this.http.get<T[]>(url)` sin tocar los componentes.
3. Los modelos ya tienen los campos que el backend devolvería.
4. Los formularios ya tienen las validaciones y estructura de payload lista.

```typescript
// Ejemplo de migración futura (solo cambiar el servicio):
// ANTES (mock):
private actividades = signal<Actividad[]>(MOCK_ACTIVIDADES);

// DESPUÉS (con backend):
agregar(actividad: Actividad): Observable<Actividad> {
  return this.http.post<Actividad>('/api/actividades', actividad);
}
```

---

## 14. Checklist de Entrega

### Actividades
- [ ] Calendario mensual con grid 7 columnas (dom–sáb)
- [ ] Navegación de meses con chevrones `<` `>`
- [ ] Botón `Hoy` que retorna al mes actual
- [ ] Dropdown selector de mes
- [ ] Colores diferenciados: fin de semana / feriado / hoy / con horas / parcial / sin horas
- [ ] Feriados Ecuador 2026 integrados
- [ ] Horas por celda calculadas desde actividades del mock
- [ ] Clic en celda abre modal con fecha pre-rellenada
- [ ] Botón "Agregar Actividad +" abre modal
- [ ] Modal con Reactive Form completo y validaciones
- [ ] Checkbox "Actividad Recurrente" muestra/oculta sección adicional
- [ ] Preview reactivo de actividades a crear (recurrente)
- [ ] Datepickers funcionales en el modal
- [ ] Agregar actividad actualiza calendario y métricas
- [ ] Modal "Generar Reporte" funcional
- [ ] Exportación `.xlsx` desde Generar Reporte
- [ ] Footer métricas calculadas reactivamente (nunca hardcodeadas)
- [ ] Leyenda de colores en header del calendario

### Seguimiento
- [ ] Tabla con todas las columnas de la imagen
- [ ] Búsqueda en tiempo real (colaborador / proyecto / cliente)
- [ ] Combobox de clientes funcional
- [ ] Datepickers Fecha Desde / Fecha Hasta con validación cruzada
- [ ] Toggle Período: Quincena / Mes Completo
- [ ] Días con Reporte y Días a Completar sincronizados con el período
- [ ] Badge de estado con colores correctos
- [ ] Checkbox de selección por fila y seleccionar todo
- [ ] Botón Aprobar activo al seleccionar filas
- [ ] Menú acciones `⋮` con "Descargar detalle" → `.xlsx`
- [ ] Botón Reporte header → exportar Excel / CSV
- [ ] Paginador `MatPaginator`
- [ ] Footer métricas calculadas reactivamente (nunca hardcodeadas)

### Core
- [ ] Sidebar con todos los ítems del menú
- [ ] Ítem Time Report expandible con sub-ítems
- [ ] Ítem activo resaltado visualmente
- [ ] Navbar con logo + "SGP."
- [ ] Layout responsivo con sidebar fijo

### General
- [ ] Fuente Inter desde Google Fonts
- [ ] Paleta de colores `#163572` / `#162056` / `#F5F5F5`
- [ ] Angular Material theme configurado
- [ ] Sin Tailwind
- [ ] Componentes standalone
- [ ] Código limpio, comentado y escalable
- [ ] Listo para conectar backend (sin romper componentes)

---

## 15. Comandos para Iniciar el Proyecto

```bash
# Crear el proyecto Angular
ng new sgp-frontend --standalone --routing --style=scss

# Navegar al proyecto
cd sgp-frontend

# Instalar Angular Material
ng add @angular/material

# Instalar SheetJS para exportación Excel
npm install xlsx

# Instalar fuente Inter
# (agregar al index.html)

# Levantar en desarrollo
ng serve --open
```

---

*Documento generado a partir del análisis de las imágenes de referencia y los requerimientos del sistema SGP — Integrity Solutions.*  
*Versión 1.0 — Mayo 2026*
