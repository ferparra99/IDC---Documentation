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

## [2026-09-01] - Sistema de logging (regla de trabajo nueva)
- **Autor:** Claude (junto con el usuario)
- **Cambio:** El proyecto no tenía un sistema de logging — solo `console.log`/`console.error` dispersos. Se agrega un logger central (`pino`, `src/shared/logger/logger.ts`, equivalente a SLF4J/Logback de Java) con niveles `debug/info/warn/error`, formateado con color en desarrollo (`pino-pretty`) y JSON estructurado en producción. Se agrega `requestLogger` (middleware, vía `pino-http`) que registra automáticamente cada request HTTP. Se reemplazan TODOS los `console.*` existentes (`migrate.ts`, `seed.ts`, `syncFestivos.ts`, `server.ts`, `errorHandler.ts`) por el logger. Se agregan `logger.info`/`logger.warn` de eventos de negocio en `AuthService` (login), `AttendanceService` (iniciar/finalizar/editar jornada), `ConfigService` (actualizar variable), `PermisoService` (crear/enviar), `ViajeService` (crear/eliminar) y `HolidaySyncService` (sincronización de festivos).
- **Nueva regla de trabajo obligatoria** (agregada a `REQUIREMENTS.md` sección 0, punto 4): todo código nuevo del backend, de aquí en adelante, debe usar el logger central en vez de `console.log`/`console.error` directo.
- **Motivo:** Solicitud explícita del usuario para tener actividad visible en consola con niveles (equivalente a `log.info` de Java), y dejarlo como estándar para el código futuro.
- **Referencia:** N/A

## [2026-09-01] - Implementación Fase 5 (reportería Excel)
- **Autor:** Claude (junto con el usuario)
- **Cambio:**
  - **Backend:** `ReportRepository` (consultas de solo lectura con JOIN a `usuarios` para el nombre del empleado, separado de los repositorios de dominio por responsabilidad distinta); `ExcelReportBuilder` (adaptador de infraestructura sobre `exceljs`, sin lógica de negocio) que genera un `.xlsx` con las hojas **"Horas laboradas"** (una fila por jornada finalizada, con desglose de horas y fila de totales) y **"Viajes laborados"** (una fila por viaje, con fila de totales), encabezados con estilo y autofiltro; `ReportService` orquesta ambos; endpoint `GET /reports/excel?desde&hasta&usuarioId`. Un empleado siempre exporta solo lo suyo (se ignora cualquier `usuarioId` distinto al propio); un administrador puede exportar el consolidado de todos los empleados omitiendo `usuarioId`. Probado generando un archivo de muestra y releyéndolo con `exceljs` para confirmar hojas, encabezados, conversión de horas a Bogotá 24h y totales correctos.
  - **Frontend:** `ReportsPage` — selector de rango de fechas, checkbox para administradores ("solo mis registros" vs. consolidado), botón de descarga que dispara el `.xlsx` vía blob.
  - Backend y frontend compilan/buildean sin errores (verificado).
- **Motivo:** Ejecutar la Fase 5 de la hoja de ruta (sección 9 de `REQUIREMENTS.md`): reportería Excel (sección 6).
- **Referencia:** N/A

## [2026-09-01] - Implementación Fase 6 (preparación app móvil) — PROYECTO COMPLETO
- **Autor:** Claude (junto con el usuario)
- **Cambio:**
  - Se hizo la revisión completa de arquitectura API-first pedida por esta fase; el resultado detallado queda en el nuevo `docs/MOBILE_READINESS.md`. Conclusión: el backend ya cumplía casi todo lo necesario (API versionada, sin sesión de servidor, respuestas uniformes `{data}`/`{error}`, hora explícita en Bogotá 24h, endpoint de salud); el único gap real para una app móvil de uso diario era la duración de la sesión.
  - **Backend:** tabla `refresh_tokens` (migración `009_refresh_tokens.sql`, tokens opacos hasheados con SHA-256, revocables); `AuthService` ahora emite un access token corto (`JWT_EXPIRES_IN`, default reducido de 8h a **1h**) más un refresh token de 30 días con **rotación** en cada renovación (el usado se revoca, se emite uno nuevo); nuevos endpoints `POST /auth/refresh` y `POST /auth/logout` (revocación real de sesión). Documentado en `API_CONTRACTS.md` y `DATABASE_SCHEMA.md` (sección 8).
  - **Frontend:** `api/client.ts` renueva automáticamente el access token ante un `401` (con deduplicación de refrescos concurrentes) y reintenta la request una vez; si el refresh también falla, limpia la sesión y notifica a `AuthContext` vía evento (`auth:sesion-expirada`) sin acoplar ambos módulos. `AuthContext.logout()` ahora revoca el refresh token en el backend (best-effort) además de limpiar el estado local. Este es el patrón de referencia que la futura app React Native debe replicar — por eso se implementó en el frontend web primero, como prueba de que funciona.
  - Pendientes explícitos que quedaron documentados y **no** se resolvieron en esta fase (ver `MOBILE_READINESS.md` y `REQUIREMENTS.md` sección 10): restringir CORS por entorno antes de producción, endpoint de cambio de contraseña, gestión de sesiones/dispositivos activos, push notifications y sincronización offline (fuera de alcance de este proyecto).
  - Backend y frontend compilan/buildean sin errores (verificado).
- **Motivo:** Ejecutar la Fase 6, última de la hoja de ruta original (sección 9 de `REQUIREMENTS.md`). Con esta entrada, las 6 fases planeadas quedan completas.
- **Referencia:** N/A

## [2026-09-02] - Dockerización + documento único de ejecución
- **Autor:** Claude (junto con el usuario)
- **Cambio:**
  - Se agrega `EJECUCION.md` en la raíz del proyecto: requisitos y pasos de ejecución, tanto manual como con Docker, en un solo documento (antes esta información vivía repartida y duplicada entre `README.md` raíz y los README de cada carpeta).
  - **Docker:** se decidió usar **tres imágenes separadas** (backend, frontend, y Postgres oficial `postgres:16-alpine`) orquestadas con `docker-compose.yml` en la raíz, en vez de un único Dockerfile monolítico — patrón estándar dado que son piezas con tecnologías y ciclos de vida independientes (Node vs. nginx vs. Postgres), permite reconstruir/escalar cada una por separado.
    - `timetracker-backend/Dockerfile`: build multi-stage (`deps` → `build` con `tsc` → `runtime`); la imagen final conserva `node_modules` completo y `src` porque los scripts de migración/seed/festivos corren con `ts-node` directo sobre `src` (mismo mecanismo que en local, sin duplicar lógica de migraciones para Docker). `docker-entrypoint.sh` corre migraciones → seed opcional (`RUN_SEED_ON_START`) → sincroniza festivos → arranca el servidor compilado.
    - `timetracker-frontend/Dockerfile`: build multi-stage (`build` con Vite → `runtime` sirviendo el estático con `nginx:1.27-alpine`); `VITE_API_BASE_URL` se pasa como build-arg (Vite la "hornea" en el bundle, no es una variable de runtime).
    - `docker-compose.yml` + `.env.example` (raíz): variables con valores por defecto razonables para desarrollo, excepto `JWT_SECRET` que es obligatoria a propósito (`${JWT_SECRET:?...}`, falla explícitamente si no se define).
  - **Validación realizada** (sin Docker instalado en el entorno de trabajo, ver limitación abajo): se replicaron manualmente los pasos de cada stage del Dockerfile — `npm ci` + `npm run build` del backend y del frontend funcionan igual que en local; se confirmó que `VITE_API_BASE_URL` queda efectivamente incrustada en el bundle de producción; se corrió `migrate.ts` vía `ts-node` con credenciales falsas y falló exactamente donde debía (al conectar a una BD inexistente), confirmando que no hay errores de rutas/módulos en el mecanismo de migraciones dentro de la imagen.
  - **Limitación documentada explícitamente** (en `EJECUCION.md` sección 5): no se ejecutó un `docker build`/`docker compose up` real de extremo a extremo porque este entorno de trabajo no tiene Docker disponible. La configuración sigue patrones estándar y probados, pero se le pidió al usuario que valide el primer `docker compose up --build` él mismo.
- **Motivo:** Solicitud explícita del usuario: un documento único de requerimientos/ejecución, y una configuración de Docker para el proyecto completo.
- **Referencia:** N/A

## [2026-09-03] - Suite de pruebas unitarias e integración (backend)
- **Autor:** Claude (junto con el usuario)
- **Cambio:** Se agrega Vitest (elegido sobre Jest por compatibilidad nativa con TypeScript/Vite, sin configuración adicional, y API compatible si algún día se migra a Jest). Convención: colocación (`Archivo.test.ts` junto a `Archivo.ts`), sin carpetas `__tests__/`. `vitest.config.ts` + `vitest.setup.ts` (variables de entorno dummy para que `shared/config/env.ts` no falle al importarse en tests). 160 pruebas en 17 archivos:
  - **Dominio (sin mocks):** `CalculadoraHorasService` (10), `ColombianHolidaysService` (7, validado contra el calendario oficial 2026 y estructuralmente para otros años), `RegistroJornada`/patrón State completo (12), `Permiso` (17), `Viaje` (14).
  - **Aplicación (repositorios mockeados a mano con `vi.fn()`, sin librería de mocking adicional):** `AttendanceService` (17), `AuthService` (10, incluida la rotación de refresh tokens), `PermisoService` (14, incluida la regla de interacción permiso/jornada de `STATE_MACHINE.md` 3.5), `ViajeService` (8), `ConfigService` (10), `HolidaySyncService` (3), `CalendarService` (4), `ReportService` (2).
  - **Infraestructura:** `ExcelReportBuilder` (5, leyendo de vuelta el `.xlsx` real generado con `exceljs`).
  - **HTTP:** `authMiddleware` (8), `errorHandler`/`asyncHandler` (6), integración completa con `supertest` contra la app real con el `container` mockeado (13) — cubre `/health`, `/auth/login`, control de acceso por rol, mapeo de errores de dominio a status HTTP, y descarga de reporte Excel.
  - Se encontraron y corrigieron 3 fallos reales de la propia suite de pruebas (no del código de producción): una condición de carrera de timestamps idénticos en `RegistroJornada.test.ts` (resuelto con `vi.useFakeTimers`), una comparación contra un objeto mutado por referencia en `AttendanceService.test.ts`, y falta de aislamiento entre tests (`vi.clearAllMocks()` a nivel de archivo, no de un solo `describe`) en `app.test.ts`.
  - **Fix real encontrado durante este trabajo:** el `tsconfig.json` de producción no soportaba `top-level await` (usado en `app.test.ts` para importar después de `vi.mock`), lo que habría roto `npm run build` — se excluyeron los `*.test.ts` del `tsconfig.json` de build (Vitest usa su propio compilador vía esbuild, no le afecta).
- **Pendiente explícito** (no bloquea el uso del sistema, es solo cobertura de pruebas): tests de repositorios contra Postgres real, tests HTTP de `/calendar`/`/leaves`/`/trips`, `ConfiguracionVigenteFactory.test.ts`, reporte de cobertura, `docs/TESTING.md`, y toda la suite del frontend (aún sin empezar).
- **Motivo:** Solicitud explícita del usuario: pruebas unitarias bien estructuradas, con la mayor cobertura de casos posible.
- **Referencia:** N/A

## [2026-09-04] - Fix crítico: el contenedor Docker del backend fallaba en ejecución real
- **Autor:** Claude (junto con el usuario)
- **Cambio:** El usuario reportó que `docker compose up` fallaba al ejecutar las migraciones con `TypeError: Unknown file extension ".ts"` / `ERR_UNKNOWN_FILE_EXTENSION` — exactamente el riesgo que había quedado documentado como no validado en la entrada del 2026-09-02. Causa: la imagen final corría `ts-node` directamente sobre archivos `.ts`, y dentro de la imagen `node:20-alpine` el loader de CommonJS de `ts-node` no se registraba correctamente (Node intentaba resolver el archivo como ESM nativo).
  - **Solución:** se elimina la dependencia de `ts-node` en tiempo de ejecución del contenedor por completo, en vez de intentar parchear el registro del loader. El Dockerfile del backend pasa de 3 a 4 stages: `deps` (dependencias completas, para compilar) → `build` (compila con `tsc` y además copia los `.sql` de las migraciones a `dist/`, ya que `tsc` no copia archivos no-`.ts`) → `deps-prod` (**nuevo**, `npm ci --omit=dev`, sin `ts-node`/`typescript`) → `runtime` (usa `node_modules` de `deps-prod`, ya no copia `src/`). Se agregan scripts `migrate:prod`/`seed:prod`/`sync:festivos:prod` en `package.json` (corren `node dist/....js`, se mantienen los originales con `ts-node` para desarrollo local). `docker-entrypoint.sh` actualizado para usar los scripts `:prod`.
  - Efecto secundario positivo: la imagen final ya no necesita `ts-node`/`typescript` en producción (216 paquetes de dependencias en vez de 437 en la simulación local), más liviana y con menor superficie.
  - **Validación esta vez:** se simuló manualmente cada uno de los 4 stages (incluido el nuevo `deps-prod`) y se ejecutaron `migrate.js`, `seed.js`, `syncFestivos.js` y `server.js` con `node` puro (sin `ts-node`) confirmando en cada uno que el único error posible era la ausencia de una base de datos real en el entorno de simulación (`ECONNREFUSED`) — el mismo patrón de validación usado en el resto del proyecto, esta vez aplicado también al camino de ejecución real del contenedor, no solo al build.
- **Motivo:** Corregir un fallo real reportado por el usuario al ejecutar `docker compose up` por primera vez.
- **Referencia:** N/A

## [2026-09-11] - Refactor State Pattern en Spring Boot (hallazgo AI Council)
- **Autor:** Muse Spark (junto con el usuario)
- **Cambio:** Solo `timetracker-backend-springboot` (Node y frontend sin tocar, contrato API intacto).
  - Nuevo paquete `modules/attendance/estado/`: interfaz `EstadoJornadaEstado` + 4 `@Component` + `EstadoJornadaResolver` (indexa `List<EstadoJornadaEstado>` por `tipo()`).
  - `AttendanceService` delega `iniciarJornada`/`finalizarJornada`/`editarManual` en `resolver.resolver(estado).validar*()` (mensajes literales preservados, sin nuevas excepciones).
  - `AttendanceServiceTest` 4→10 tests, `mvn test` 55 OK, `mvn package` BUILD SUCCESS.
- **Motivo:** Hallazgo AI Council — `EstadoJornada` enum plano con `if (estado == ...)` en `AttendanceService` violaba State obligatorio (`refactor-state-pattern-plan.md`).
- **Referencia:** `refactor-state-pattern-plan.md`
