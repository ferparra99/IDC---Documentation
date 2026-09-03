# Timetracker — Backend (Fase 1)

API del sistema de control de jornada laboral. **Antes de tocar cualquier código, lee `docs/REQUIREMENTS.md`** — es la fuente única de verdad del proyecto. El detalle técnico complementario vive en `docs/DATABASE_SCHEMA.md`, `docs/API_CONTRACTS.md` y `docs/STATE_MACHINE.md`. Todo cambio de alcance debe quedar registrado en `docs/CHANGELOG.md`.

## Alcance de esta fase

- Esquema de base de datos (`usuarios`, `configuracion_sistema`, `registro_jornada`).
- Autenticación (login con JWT).
- Variables de sistema versionadas (lectura y actualización, solo administrador).
- Módulo de fichaje (iniciar/finalizar jornada) con cálculo automático de horas ordinarias, extra diurnas/nocturnas y dominical/festivo (aproximado a fin de semana; festivos colombianos se integran en Fase 2 junto al calendario).
- Máquina de estados de la jornada implementada con el **patrón State** (`src/domain/states`), sin cierre automático (decisión confirmada: una jornada sin cerrar permanece `JORNADA_ACTIVA` hasta que se cierre manualmente).

**Fuera de alcance de esta fase** (ver `docs/REQUIREMENTS.md` sección 9): calendario editable, permisos, viajes, reportería Excel, auditoría de ediciones manuales.

## Requisitos previos

- Node.js 20+
- PostgreSQL 14+

## Instalación

```bash
npm install
cp .env.example .env
# edita .env con tu cadena de conexión real a PostgreSQL y un JWT_SECRET propio
npm run migrate   # crea las tablas
npm run seed      # crea el usuario administrador inicial y la configuración base
npm run dev        # levanta la API en http://localhost:3000
```

Usuario administrador inicial: el email/password definidos en `.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). **Cámbialo después del primer login** — Fase 1 no incluye endpoint de cambio de contraseña; agrégalo antes de ir a producción.

## Estructura (Clean Architecture / capas)

```
src/
  domain/          entidades, patrón State, motor de cálculo de horas, errores — sin dependencias externas
  application/      servicios que orquestan dominio + repositorios (casos de uso)
  infrastructure/    PostgreSQL: pool, migraciones SQL, repositorios
  interfaces/http/  Express: rutas, controladores, middlewares, composition root (container.ts)
  shared/           config de entorno y utilidades (zona horaria Bogotá, formato 24h)
```

Esta separación es la que permite cumplir SOLID:
- **S**: cada clase tiene una responsabilidad (ej. `CalculadoraHorasService` solo calcula horas, `RegistroJornadaRepository` solo persiste).
- **O**: agregar un estado nuevo a la máquina de estados no obliga a tocar los estados existentes.
- **L**: cualquier `JornadaState` concreto es sustituible donde se espere la clase base.
- **I**: los controladores dependen de servicios de aplicación, no de repositorios completos.
- **D**: el dominio (`RegistroJornada`, `CalculadoraHorasService`) no importa nada de `pg` ni de `express`.

## Logging

El proyecto usa un logger central (`pino`, en `src/shared/logger/logger.ts`) — el equivalente a SLF4J/Logback en Java. **Regla obligatoria del proyecto** (ver `docs/REQUIREMENTS.md` sección 0): nunca usar `console.log`/`console.error` directamente; siempre `logger.info/warn/error/debug`.

```bash
LOG_LEVEL=debug npm run dev   # más detalle en desarrollo
LOG_LEVEL=warn npm run dev    # solo advertencias y errores
```

- En desarrollo se imprime formateado y con color (`pino-pretty`).
- En producción (`NODE_ENV=production`) se imprime JSON estructurado, una línea por evento, listo para un colector de logs.
- Toda request HTTP se registra automáticamente (método, ruta, status, duración) vía el middleware `requestLogger`.
- Los servicios de aplicación registran eventos de negocio clave: login (éxito/fallo), jornada iniciada/finalizada/editada, permiso creado/enviado, viaje registrado/eliminado, configuración actualizada.

## Endpoints principales (ver `docs/API_CONTRACTS.md` para el detalle completo)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/auth/login` | Login, devuelve JWT |
| GET | `/api/v1/attendance/today` | Estado de jornada del usuario autenticado hoy |
| POST | `/api/v1/attendance/start` | Iniciar jornada |
| POST | `/api/v1/attendance/finish` | Finalizar jornada (requiere `descripcionProyectos`) |
| GET | `/api/v1/attendance?desde&hasta` | Listar registros en un rango |
| GET | `/api/v1/attendance/summary?desde&hasta` | Resumen semanal (horas trabajadas/mínimas/extra/faltantes) |
| GET | `/api/v1/config` | Variables de sistema vigentes |
| PUT | `/api/v1/config/:clave` | Actualizar una variable (solo administrador) |

## Pendientes explícitos dejados para fases siguientes

- Endpoint de cambio de contraseña / gestión de usuarios.
- Consulta de configuración "vigente en fecha X" (hoy solo se resuelve "vigente hoy" — ver comentario en `ConfiguracionVigenteFactory.ts`).
- Integración de festivos colombianos y auditoría de ediciones manuales (Fase 2).
- Selección explícita de qué jornada activa cerrar cuando hay más de una sin cerrar (hoy se cierra la más antigua por FIFO — ver comentario en `AttendanceService.finalizarJornada`).
