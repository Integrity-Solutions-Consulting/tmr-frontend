# Resumen de Trabajo — Frontend (`tmr-frontend`)

**Fecha:** 05 de noviembre de 2026  
**Rama:** `feat/permisos`  
**Módulo principal:** Solicitudes de Permisos, Licencias y Vacaciones + Campana de Notificaciones SSE  
**Documento rector:** `docs/requerimientos-solicitudes-v2.docx`

---

## 1. Lo que quedó implementado y consolidado (Estado actual)

### 1.1. Modal de "Nueva Solicitud" conectado 100% a Base de Datos (Cero datos quemados)
En `src/app/features/time-report/permisos/mis-permisos/` (`mis-permisos.ts`, `mis-permisos.html`, `mis-permisos.scss`):
- **Datos reales del colaborador**: Encabezado e identificadores alimentados exclusivamente desde `GET /api/permisos/contexto` (Apellidos y nombres, Cédula, Cargo, Área/Departamento, Código de empleado y Régimen contractual `Nómina` vs `Servicios Profesionales`).
- **Buscador filtrable (Combobox accesible) de Cliente / Proyecto**:
  - Permite buscar en vivo escribiendo el nombre del **Cliente**, del **Proyecto** o del **Líder**.
  - Muestra primero los proyectos asignados directamente al colaborador con insignia **`Asignado a ti`** y permite seleccionar proyectos activos registrados en PostgreSQL.
  - Implementado con roles de accesibilidad (`role="combobox"`, `role="listbox"`, `aria-expanded`, `aria-controls`) y cierre automático al seleccionar o perder foco.
- **Autocompletado automático del Jefe Inmediato**:
  - Al seleccionar un **Cliente / Proyecto**, el sistema asigna automáticamente el **Jefe Inmediato** vinculado a ese proyecto en base de datos, mostrando su tipo (**Líder Interno ISC** o **Líder Cliente Externo**) y su correo corporativo de notificación.

### 1.2. Reglas del Formulario Oficial de Talento Humano, Evidencias MinIO y PDF Unificado
- **Catálogo dinámico de tipos de solicitud**: Se alimenta desde el catálogo normalizado del backend (`VACACIONES`, `LICENCIA_PATERNIDAD`, `LICENCIA_MATERNIDAD`, `PERMISO_PERSONAL`, `LICENCIA_CALAMIDAD`, `LICENCIA_ENFERMEDAD`, `PERMISO_ESTUDIOS`, `OTRO`).
- **Cálculo reactivo de fechas y jornada**: Cálculo automático de días hábiles solicitados, horas equivalentes y fecha de regreso según el horario (`COMPLETA`, `MANANA`, `TARDE`, `OTROS`).
- **Regla `RF-004` (Certificado Médico Obligatorio)**: El signal computado `requiereCertificadoMedicoObligatorio` detecta en tiempo real cuando un colaborador en **Nómina** selecciona **Licencia por enfermedad** por más de **1 día hábil**, marcando el respaldo como obligatorio y validándolo antes del envío.
- **Carga y descarga de adjuntos (`PDF`, `PNG`, `JPG <= 5 MB`)**:
  - Zona de carga en el modal de Nueva Solicitud (`input type="file"` con validación de extensión y peso máximo de 5 MB) que envía `multipart/form-data` a `POST /api/permisos/con-evidencia`.
  - Descarga autenticada de respaldos desde MinIO (`GET /api/permisos/{id}/evidencia`) y descarga pública por token (`GET /api/permisos/externo/{token}/evidencia`).
- **Generación de PDF Oficial Unificada (QuestPDF en Backend)**:
  - `PermisosPdfService` (`permisos-pdf.service.ts`) descarga siempre el documento oficial generado por el backend (`GET /api/permisos/{id}/pdf` y `GET /api/permisos/externo/{token}/pdf`), garantizando un único formato institucional en todas las bandejas.

### 1.3. Vistas del Flujo de Aprobación y Protección de Rutas (`roleGuard`)
Todas las rutas internas cuentan con `canActivate: [roleGuard]` en `app.routes.ts` y consumen los DTOs reales del backend (sin sufijos `Mock` ni métodos de simulación):
- **`MisPermisosComponent`** (`mis-permisos.ts` — `/permisos`): Mis solicitudes (`SolicitudColaborador`), KPIs reales (días disponibles según antigüedad, en proceso, aprobados, horas acumuladas), detalle de seguimiento y vista previa oficial.
- **`AprobacionesLiderComponent`** (`aprobaciones-lider.ts` — `/permisos/equipo`): Bandeja de aprobación, observación y rechazo de Nivel 1 (`SolicitudEquipo`, `registrarDecisionLider`) para Jefes Inmediatos internos (`POST /api/permisos/{id}/decision-lider`).
- **`RevisionExternaComponent`** (`revision-externa.ts` — `/permisos/revision-externa?token=...`): Página pública por query param `token` para que líderes de clientes externos aprueben, observen o rechacen sin iniciar sesión en TMR (`GET /api/permisos/externo/{token}` y `POST /api/permisos/externo/{token}/decision`).
- **`GestionRrhhComponent`** (`gestion-rrhh.ts` — `/permisos/rrhh`): Bandeja de Nivel 2 (Talento Humano, `SolicitudRrhh`) para confirmar aplicación en Time Report o devolver solicitudes (`POST /api/permisos/{id}/decision-rrhh`) y regenerar enlaces externos (`POST /api/permisos/{id}/reenviar-enlace`).
- **`PermisosGerenciaComponent`** (`permisos-gerencia.ts` — `/permisos/gerencia`): Tablero ejecutivo y reportería consolidada para Gerencia (`SolicitudGerencia`).
- **`FormularioPermisoOficialComponent`** (`formulario-permiso-oficial.ts`, `formulario-permiso-oficial.html`): Vista previa en pantalla del formulario oficial de Solicitud de Permisos, Licencias y Vacaciones.

### 1.4. Campana de Notificaciones Internas en Tiempo Real (SSE)
- **`NotificacionesInternasService`** (`src/app/shared/services/notificaciones-internas.service.ts`) y **`NotificacionesService`** (`src/app/shared/services/notificaciones.service.ts`):
  - Mantiene abierta la suscripción SSE contra `GET /api/notificaciones/internas/stream` con reconexión exponencial automática mientras la sesión JWT esté activa.
  - Gestiona el contador reactivo de notificaciones no leídas, marcado individual (`marcarLeida`) y marcado masivo (`marcarTodasLeidas`).
- **`Navbar` y `AppComponent`** (`navbar.ts`, `navbar.html`, `app.component.ts`):
  - Integra la lista de avisos de solicitudes en la campana superior con navegación directa a la bandeja correspondiente (`urlDestino`).

---

## 2. Inventario de archivos del Frontend

### Archivos creados
- `tmr-frontend/src/app/shared/services/notificaciones-internas.service.ts`

### Archivos modificados
- `tmr-frontend/src/app/app.routes.ts`
- `tmr-frontend/src/app/features/time-report/permisos/permisos-api.service.ts`
- `tmr-frontend/src/app/features/time-report/permisos/permisos-pdf.service.ts`
- `tmr-frontend/src/app/features/time-report/permisos/mis-permisos/mis-permisos.ts`
- `tmr-frontend/src/app/features/time-report/permisos/mis-permisos/mis-permisos.html`
- `tmr-frontend/src/app/features/time-report/permisos/mis-permisos/mis-permisos.scss`
- `tmr-frontend/src/app/features/time-report/permisos/aprobaciones-lider/aprobaciones-lider.ts`
- `tmr-frontend/src/app/features/time-report/permisos/aprobaciones-lider/aprobaciones-lider.html`
- `tmr-frontend/src/app/features/time-report/permisos/gestion-rrhh/gestion-rrhh.ts`
- `tmr-frontend/src/app/features/time-report/permisos/permisos-gerencia/permisos-gerencia.ts`
- `tmr-frontend/src/app/features/time-report/permisos/revision-externa/revision-externa.ts`
- `tmr-frontend/src/app/features/time-report/permisos/formulario-permiso-oficial/formulario-permiso-oficial.ts`
- `tmr-frontend/src/app/features/time-report/permisos/formulario-permiso-oficial/formulario-permiso-oficial.html`
- `tmr-frontend/src/app/shared/services/notificaciones.service.ts`
- `tmr-frontend/src/app/core/layout/navbar/navbar.ts`
- `tmr-frontend/src/app/core/layout/navbar/navbar.html`
- `tmr-frontend/src/app/app.component.ts`
