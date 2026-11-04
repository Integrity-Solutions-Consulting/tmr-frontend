# Resumen de Trabajo — Frontend (`tmr-frontend`)

**Fecha:** 04 de noviembre de 2026  
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
  - Muestra primero los proyectos asignados directamente al colaborador con insignia **`Asignado a ti`** y permite seleccionar cualquier proyecto activo registrado en PostgreSQL (incluso operando desde cuentas administrativas).
  - Implementado con roles de accesibilidad (`role="combobox"`, `role="listbox"`, `aria-expanded`, `aria-controls`) y cierre automático al seleccionar o perder foco.
- **Autocompletado automático del Jefe Inmediato**:
  - Al seleccionar un **Cliente / Proyecto**, el sistema asigna automáticamente el **Jefe Inmediato** vinculado a ese proyecto en base de datos, mostrando su tipo (**Líder Interno ISC** o **Líder Cliente Externo**) y su correo corporativo de notificación.
  - Incluye respaldo manual al catálogo real de líderes (`lideresDisponibles`) únicamente si un proyecto en BD aún no tuviera líder configurado.

### 1.2. Reglas del Formulario Oficial de Talento Humano y Evidencias MinIO
- **Catálogo dinámico de tipos de solicitud**: Se alimenta desde el catálogo normalizado del backend (`VACACIONES`, `LICENCIA_PATERNIDAD`, `LICENCIA_MATERNIDAD`, `PERMISO_PERSONAL`, `LICENCIA_CALAMIDAD`, `LICENCIA_ENFERMEDAD`, `PERMISO_ESTUDIOS`).
- **Cálculo reactivo de fechas y jornada**: Cálculo automático de días hábiles solicitados, horas equivalentes y fecha de regreso según el horario (`COMPLETA`, `MANANA`, `TARDE`, `OTROS`).
- **Regla `RF-004` (Certificado Médico Obligatorio)**: El signal computado `requiereCertificadoMedicoObligatorio` detecta en tiempo real cuando un colaborador en **Nómina** selecciona **Licencia por enfermedad** por más de **1 día hábil**, marcando el respaldo como obligatorio y validándolo antes del envío.
- **Carga y descarga de adjuntos (`PDF`, `PNG`, `JPG <= 5 MB`)**:
  - Zona de carga en el modal de Nueva Solicitud (`input type="file"` con validación de extensión y peso máximo de 5 MB) que envía `multipart/form-data` a `POST /api/permisos/con-evidencia`.
  - Descarga autenticada de respaldos desde MinIO (`GET /api/permisos/{id}/evidencia`) y descarga del formulario oficial en PDF (`GET /api/permisos/{id}/pdf`) en todas las bandejas.

### 1.3. Vistas del Flujo de Aprobación y Formato Imprimible
Quedaron integradas contra los DTOs normalizados del backend:
- **`MisPermisosComponent`** (`mis-permisos.ts`): Mis solicitudes, KPIs reales (días disponibles, en proceso, aprobados, horas acumuladas), detalle de seguimiento y vista previa oficial.
- **`AprobacionesLiderComponent`** (`aprobaciones-lider.ts`): Bandeja de aprobación/rechazo de Nivel 1 para Jefes Inmediatos internos.
- **`RevisionExternaComponent`** (`revision-externa.ts`): Página pública por token (`/revision-externa/:token`) para que líderes de clientes externos aprueben o rechacen sin iniciar sesión en TMR.
- **`GestionRrhhComponent`** (`gestion-rrhh.ts`): Bandeja de Nivel 2 (Talento Humano) para confirmar aplicación en Time Report, observar o rechazar solicitudes aprobadas por el líder.
- **`PermisosGerenciaComponent`** (`permisos-gerencia.ts`): Tablero ejecutivo y reportería consolidada para Gerencia.
- **`FormularioPermisoOficialComponent`** (`formulario-permiso-oficial.ts`, `formulario-permiso-oficial.html`): Representación fiel del formulario físico oficial de Solicitud de Permisos, Licencias y Vacaciones.

### 1.4. Campana de Notificaciones Internas en Tiempo Real (SSE)
- **`NotificacionesInternasService`** (`src/app/shared/services/notificaciones-internas.service.ts`) y **`NotificacionesService`** (`src/app/shared/services/notificaciones.service.ts`):
  - Mantiene abierta la suscripción SSE contra `GET /api/notificaciones/internas/stream` con reconexión exponencial automática mientras la sesión JWT esté activa.
  - Gestiona el contador reactivo de notificaciones no leídas, marcado individual (`marcarLeida`) y marcado masivo (`marcarTodasLeidas`).
- **`Navbar` y `AppComponent`** (`navbar.ts`, `navbar.html`, `app.component.ts`):
  - Integra la lista de avisos de solicitudes en la campana superior con navegación directa a la bandeja correspondiente (`urlDestino`).

---

## 2. Lo que se corrigió hoy en el Frontend

| # | Problema / Error detectado | Causa raíz | Corrección aplicada |
|---|---|---|---|
| **1** | Error de compilación `TS2339: Property 'requiereCertificadoMedicoObligatorio' does not exist on type 'MisPermisosComponent'` en `mis-permisos.html:349`. | La plantilla HTML ya referenciaba el signal computado de la regla `RF-004`, pero `mis-permisos.ts` aún no tenía declaradas las propiedades reactivas del régimen contractual y catálogo. | Se declararon e integraron en `mis-permisos.ts` los signals `esColaboradorNomina`, `tipoContratoColaborador`, `tiposPermisoCatalogo` y el `computed()` `requiereCertificadoMedicoObligatorio`, verificando compilación limpia con `npm run build` (`0 errores`). |
| **2** | Al abrir **Nueva Solicitud**, el selector de **Cliente / Proyecto** y el **Jefe Inmediato** aparecían vacíos aunque `GET /api/permisos/contexto` devolvía `200 OK` con datos desde PostgreSQL. | El interceptor global `ApiResponseInterceptor` (`src/app/core/interceptors/api-response.interceptor.ts`) desenvuelve automáticamente toda respuesta `{ success, statusCode, message, data }` reemplazando el `body` por `body.data`. Al recibir el objeto directo, las validaciones `if (!res?.success \|\| !res.data)` descartaban los datos silenciosamente. | Se implementó `normalizarEnvelope<T>()` en `PermisosApiService` (`permisos-api.service.ts`) para soportar de forma transparente tanto respuestas desenvueltas por el interceptor como sobres `ApiEnvelope<T>` completos en todos los métodos del módulo. |
| **3** | Existían valores de respaldo quemados en pantalla (`'Sin asignar'`, textos fijos) y el `<select>` simple no permitía buscar entre proyectos ni dejaba claro el llenado automático del líder. | El componente inicial tenía valores por defecto estáticos pensados para maqueta antes de conectar la BD real. | Se eliminaron los valores quemados en `mis-permisos.ts` y `mis-permisos.html`, se implementó el combobox buscable de **Cliente / Proyecto** y se conectó `seleccionarProyectoCombobox()` para poblar automáticamente el **Jefe Inmediato** del proyecto seleccionado. |

---

## 3. Inventario de archivos del Frontend

### Archivos creados
- `tmr-frontend/src/app/shared/services/notificaciones-internas.service.ts`

### Archivos modificados
- `tmr-frontend/src/app/features/time-report/permisos/permisos-api.service.ts`
- `tmr-frontend/src/app/features/time-report/permisos/mis-permisos/mis-permisos.ts`
- `tmr-frontend/src/app/features/time-report/permisos/mis-permisos/mis-permisos.html`
- `tmr-frontend/src/app/features/time-report/permisos/mis-permisos/mis-permisos.scss`
- `tmr-frontend/src/app/features/time-report/permisos/aprobaciones-lider/aprobaciones-lider.ts`
- `tmr-frontend/src/app/features/time-report/permisos/gestion-rrhh/gestion-rrhh.ts`
- `tmr-frontend/src/app/features/time-report/permisos/permisos-gerencia/permisos-gerencia.ts`
- `tmr-frontend/src/app/features/time-report/permisos/revision-externa/revision-externa.ts`
- `tmr-frontend/src/app/features/time-report/permisos/formulario-permiso-oficial/formulario-permiso-oficial.ts`
- `tmr-frontend/src/app/features/time-report/permisos/formulario-permiso-oficial/formulario-permiso-oficial.html`
- `tmr-frontend/src/app/shared/services/notificaciones.service.ts`
- `tmr-frontend/src/app/core/layout/navbar/navbar.ts`
- `tmr-frontend/src/app/core/layout/navbar/navbar.html`
- `tmr-frontend/src/app/app.component.ts`

