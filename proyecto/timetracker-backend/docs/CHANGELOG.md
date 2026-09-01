# CHANGELOG — Trazabilidad de cambios del proyecto

> Formato: cada entrada documenta un cambio de alcance, requerimiento o decisión técnica relevante. Ver sección 8 de `REQUIREMENTS.md` para el formato de auditoría a nivel de datos (dentro de la aplicación).

---

## [2026-08-30] - Documentación inicial
- **Autor:** Claude (junto con el usuario)
- **Cambio:** Creación del documento maestro `REQUIREMENTS.md` con el alcance completo del proyecto (módulos de fichaje, visualización de horas, permisos, viajes, reportería Excel, variables de sistema y marco legal colombiano) y de este `CHANGELOG.md`.
- **Motivo:** Establecer la fuente única de verdad antes de iniciar cualquier implementación.
- **Referencia:** N/A (kickoff del proyecto)

## [2026-08-30] - Gestión de estado y calendario
- **Autor:** Claude (junto con el usuario)
- **Cambio:** Se resuelven dos decisiones abiertas en `REQUIREMENTS.md`: (1) el manejo de estado de la jornada en frontend usará el patrón de diseño State, sincronizado con backend como fuente de verdad (nueva sección 11); (2) el módulo de calendario integrará una librería de festivos colombianos y resaltará sábados/domingos con color distintivo (nueva sección 12).
- **Motivo:** Definición explícita del usuario sobre arquitectura de estado y requisitos visuales del calendario.
- **Referencia:** N/A

## [2026-08-30] - Documentación técnica de detalle
- **Autor:** Claude (junto con el usuario)
- **Cambio:** Se agregan tres documentos complementarios: `DATABASE_SCHEMA.md` (esquema de BD detallado, incluye estado `JORNADA_INCOMPLETA` no contemplado antes), `API_CONTRACTS.md` (endpoints REST con ejemplos de request/response y códigos de error) y `STATE_MACHINE.md` (diagrama de la máquina de estados y casos borde: olvido de fichar salida, doble inicio, permisos vs. jornada ya registrada, cambio de variables de sistema a mitad de jornada). `REQUIREMENTS.md` se actualiza con referencia cruzada a estos documentos (sección 10.1).
- **Motivo:** Profundizar el diseño técnico antes de iniciar la implementación de la Fase 1.
- **Referencia:** N/A

## [2026-08-30] - Ajuste de manejo de tiempo y confirmación de permisos
- **Autor:** Claude (junto con el usuario)
- **Cambio:** Se elimina el estado `JORNADA_INCOMPLETA` y el job de cierre automático de jornada (definidos previamente en `STATE_MACHINE.md`). Se confirma: la hora se toma del reloj del servidor, zona horaria `America/Bogota`, formato de visualización 24 horas; no habrá cierre automático — una jornada sin cerrar permanece `JORNADA_ACTIVA` indefinidamente hasta cierre manual (nuevo caso borde 3.1 documentado). Se actualiza el enum de estado en `DATABASE_SCHEMA.md` y las decisiones abiertas en `REQUIREMENTS.md`. Se confirma también que la integración de permisos con el módulo de horas se resolverá en Fase 3.
- **Motivo:** Definición explícita del usuario sobre manejo de hora/zona horaria y alcance de la Fase 3.
- **Referencia:** N/A

## [2026-08-31] - Implementación Fase 1 (backend)
- **Autor:** Claude (junto con el usuario)
- **Cambio:** Se implementa la Fase 1 completa en `timetracker-backend/`: migraciones SQL (`usuarios`, `configuracion_sistema`, `registro_jornada`), autenticación JWT, módulo de configuración de sistema versionada, y módulo de fichaje (iniciar/finalizar jornada, listar, resumen semanal) con la máquina de estados implementada mediante el patrón State (`SinIniciarState`, `JornadaActivaState`, `JornadaFinalizadaState`) y un motor de cálculo de horas (`CalculadoraHorasService`) que separa horas ordinarias/extra diurnas/extra nocturnas/dominical-festivo. Se agrega la variable de sistema `horasOrdinariasPorDia` (no listada explícitamente antes) como umbral necesario para que el motor de cálculo detecte horas extra dentro de un turno; se documenta en `REQUIREMENTS.md` sección 4. Simplificación documentada: en Fase 1 el cálculo dominical/festivo solo detecta fin de semana (domingo); la detección de festivos colombianos reales queda para Fase 2 junto al calendario. Proyecto compilado y probado (compilación TypeScript limpia + pruebas manuales del motor de cálculo con 3 casos representativos).
- **Motivo:** Ejecutar la Fase 1 definida en la hoja de ruta (sección 9 de `REQUIREMENTS.md`).
- **Referencia:** N/A

## [2026-08-31] - Implementación Fase 2 (calendario, edición auditada, festivos)
- **Autor:** Claude (junto con el usuario)
- **Cambio:**
  - **Backend:** migraciones `festivos` y `audit_log`; `ColombianHolidaysService` (cálculo algorítmico de festivos colombianos vía Ley Emiliani + fecha de Pascua, sin dependencia externa frágil, validado contra el calendario oficial 2026); `HolidaySyncService` (sincronización perezosa e idempotente por año); `CalendarService` y endpoint `GET /calendar?anio&mes` (horas trabajadas, festivo, fin de semana por día); edición manual auditada de jornadas finalizadas vía `PUT /attendance/:id` (`RegistroJornada.editarManualmente`, fuera del patrón State por no ser una transición — ver comentario en el código), con registro en `audit_log` (valor anterior/nuevo + motivo obligatorio).
  - **Frontend (nuevo, `timetracker-frontend/`):** React + Vite + TypeScript. Login, página de fichaje (Fase 1) y página de calendario mensual con colores distintivos para fines de semana/festivos, panel de resumen semanal, y edición de horas por barras arrastrables (`DraggableHoursBar`, Pointer Events nativos) con motivo obligatorio.
  - Ambos proyectos compilan y buildean sin errores (`tsc` + `vite build` verificados).
- **Motivo:** Ejecutar la Fase 2 de la hoja de ruta (sección 9 de `REQUIREMENTS.md`): módulo de visualización de horas (5.2) con auditoría.
- **Referencia:** N/A

## [2026-08-31] - Implementación Fase 3 (permisos)
- **Autor:** Claude (junto con el usuario)
- **Cambio:**
  - **Backend:** migración `permisos`; entidad de dominio `Permiso` (invariantes propias, sin patrón State completo por ser un ciclo de vida de un solo `if` — decisión documentada en el código para evitar sobre-ingeniería); `PermisoService` con las operaciones crear/editar/preview/enviar/listar; endpoints `POST /leaves`, `PUT /leaves/:id`, `GET /leaves/:id/preview`, `POST /leaves/:id/submit`, `GET /leaves`. Se implementa la regla de interacción con jornadas ya registradas (docs/STATE_MACHINE.md 3.5): permiso `COMPLETO` rechazado si el día ya tiene jornada, permiso `PARCIAL` rechazado si excede las horas restantes del día.
  - **Simplificación de diseño:** el estado `PENDIENTE_ENVIO` definido originalmente en `DATABASE_SCHEMA.md` se elimina; el modelo queda en dos estados (`BORRADOR`/`ENVIADO`) porque la previsualización no es una transición, es una vista de solo lectura sobre el `BORRADOR`. Actualizado en `DATABASE_SCHEMA.md` y `API_CONTRACTS.md`.
  - **Frontend:** `LeavesPage` con el flujo completo formulario → previsualización (datos del empleado + del permiso) → botones Editar/Enviar → popup de confirmación → envío.
  - Backend y frontend compilan/buildean sin errores (verificado).
- **Motivo:** Ejecutar la Fase 3 de la hoja de ruta (sección 9 de `REQUIREMENTS.md`): módulo de permisos (5.3).
- **Referencia:** N/A

## [2026-08-31] - Implementación Fase 4 (viajes)
- **Autor:** Claude (junto con el usuario)
- **Cambio:**
  - **Backend:** migración `viajes` (sin restricción única por día, ya que se permiten múltiples viajes/día); se siembra la variable de sistema `valorViajePorDefecto` (reservada desde Fase 1, sin uso hasta ahora); entidad `Viaje` (sin estados, solo invariantes de datos — documentado en el código por qué no aplica ningún patrón adicional aquí); `ViajeService` con crear/editar/eliminar/listar; endpoints `POST /trips`, `GET /trips`, `PUT /trips/:id`, `DELETE /trips/:id` (los dos últimos no estaban en el diseño original de `API_CONTRACTS.md`, se agregan por consistencia y quedan documentados ahí).
  - **Frontend:** `TripsPage` — selector de día, listado de viajes de ese día (soporta varios por día), formulario de alta con el valor prellenado desde la variable de sistema pero editable, y edición/eliminación de viajes ya cargados.
  - Backend y frontend compilan/buildean sin errores (verificado).
- **Motivo:** Ejecutar la Fase 4 de la hoja de ruta (sección 9 de `REQUIREMENTS.md`): módulo de viajes (5.4).
- **Referencia:** N/A
