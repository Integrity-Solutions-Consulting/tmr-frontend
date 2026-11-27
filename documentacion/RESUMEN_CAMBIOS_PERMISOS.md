# Cambios recientes de Permisos

**Rama:** `develop`  
**Base de comparación:** commit `49563ca` (última versión anterior del módulo en frontend).

## Cambios incluidos desde esa versión

- Se compactó el formulario de nueva solicitud en una columna, se redujeron campos visibles y se mantuvieron las reglas existentes para fechas, jornada, saldo y adjuntos.
- Mis Permisos, Aprobación Líder, Validación RRHH y Gerencia comparten patrones de resumen, detalles desplegables y estados fáciles de escanear.
- Líder puede aprobar desde la tabla; observar y rechazar requieren comentario. RRHH mantiene la confirmación final y el impacto en Time Report.
- El portal externo de Magic Link conserva la consulta y decisión de la solicitud, y permite acceder a cada respaldo adjunto.
- Los respaldos usan almacenamiento MinIO/S3 y los endpoints descargan adjuntos por identificador. El PDF oficial aclara dónde acceder al respaldo.
- Gerencia ofrece exportación de la selección a Excel o PDF. El Excel se redujo a nueve columnas principales.
- Se simplificaron los filtros de período y se agruparon los estados del semáforo. El historial Gerencia muestra **En aprobación** para solicitudes que esperan decisión del Líder o RRHH; Gerencia puede consultarlas y exportarlas, pero no cambiar su estado.

## Cómo leer los estados

El estado indica en qué etapa del flujo está la solicitud; el permiso del rol determina quién puede decidirla. En Gerencia, «En aprobación» es un indicador de seguimiento, no una acción disponible en esa pantalla. Las decisiones siguen correspondiendo a Líder y RRHH.

## Archivos locales

La configuración local de desarrollo de MinIO permanece en `appsettings.Development.json` y no forma parte de los commits compartidos.

## Validación

No se ejecutó QA de usuario ni se probaron decisiones contra datos reales; el flujo queda listo para la revisión manual.
