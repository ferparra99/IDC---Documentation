# Sistema de Control de Jornada Laboral

Aplicación para la gestión del tiempo laboral de empleados en Colombia: fichaje con cálculo automático de horas, calendario editable, permisos, viajes y reportería. **Proyecto completo — las 6 fases de la hoja de ruta original están implementadas.**

**Antes de tocar cualquier código, lee `timetracker-backend/docs/REQUIREMENTS.md`** — es la fuente única de verdad del proyecto (alcance, reglas de negocio, decisiones tomadas, incluida la regla de logging obligatorio). El detalle técnico complementario está en esa misma carpeta `docs/`: `DATABASE_SCHEMA.md`, `API_CONTRACTS.md`, `STATE_MACHINE.md`, `MOBILE_READINESS.md`, y todo cambio de alcance queda trazado en `CHANGELOG.md`.

**Para instalar/ejecutar el proyecto (manual o con Docker), ve directo a [`EJECUCION.md`](./EJECUCION.md)** — este README se enfoca en el panorama general; los pasos detallados están ahí.

## Estado del proyecto

| Fase | Módulo | Backend | Frontend |
|---|---|---|---|
| 1 | Base de datos, autenticación, variables de sistema, fichaje | ✅ | ✅ `AttendancePage` |
| 2 | Calendario, edición auditada, festivos colombianos | ✅ | ✅ `CalendarPage` |
| 3 | Permisos (formulario → previsualización → envío) | ✅ | ✅ `LeavesPage` |
| 4 | Viajes / desplazamientos | ✅ | ✅ `TripsPage` |
| 5 | Reportería Excel | ✅ | ✅ `ReportsPage` |
| 6 | Preparación para app móvil nativa (sesiones largas con refresh token) | ✅ | ✅ (patrón de referencia en `api/client.ts`) |

Backends: **Node y Spring Boot son intercambiables** — mismo frontend (`VITE_API_BASE_URL`), misma DB y mismos contratos `/api/v1`. Elige uno con `docker-compose.*.yml` (ver `EJECUCION.md`).
Transversal: sistema de logging (`pino` en Node, `SLF4J/Logback` en Spring) en todo el backend.

## Estructura del repositorio

```
proyecto/
  docker-compose.yml              Orquesta db + backend + frontend (ver EJECUCION.md)
  docker-compose.node.yml         Override backend Node
  docker-compose.spring.yml       Override backend Spring Boot
  .env.example                     Variables para docker-compose
  EJECUCION.md                      Requisitos y pasos de ejecución (manual y Docker, elige backend)
  timetracker-backend/            API REST — Node.js + Express + TypeScript + PostgreSQL
    Dockerfile, docker-entrypoint.sh
    docs/                         REQUIREMENTS.md, DATABASE_SCHEMA.md, API_CONTRACTS.md,
                                    STATE_MACHINE.md, MOBILE_READINESS.md, CHANGELOG.md
  timetracker-backend-springboot/ API REST — Java 21 + Spring Boot 3.3 + JPA + Flyway + PostgreSQL (clon)
    Dockerfile, docker-entrypoint.sh
    src/main/java/com/idc/timetracker/{common,modules/*,health}
    src/main/resources/db/migration/  V1-V9 (copia literal 001-009 Node)
  timetracker-frontend/           App web — React + Vite + TypeScript
    Dockerfile, nginx.conf
    src/pages/                    LoginPage, AttendancePage, CalendarPage, LeavesPage, TripsPage, ReportsPage
```

Cada carpeta tiene su propio `README.md` con detalle específico. Para requisitos y pasos de ejecución (manual **o** con Docker), ver **[`EJECUCION.md`](./EJECUCION.md)**.

## Flujo básico para probar todo

1. Inicia sesión.
2. **Fichaje**: "Iniciar jornada" / "Finalizar jornada" con descripción.
3. **Calendario**: navega meses, festivos/fines de semana en color, edita horas con barras arrastrables (motivo obligatorio, queda auditado).
4. **Permisos**: formulario → previsualización → Editar/Enviar → confirmación.
5. **Viajes**: uno o varios por día, valor editable con default desde variables de sistema.
6. **Reportes**: descarga `.xlsx` con "Horas laboradas" y "Viajes laborados" para un rango de fechas.

Nota sobre sesión: el access token expira en 1h pero el frontend lo renueva solo con el refresh token (30 días) — ver `timetracker-backend/docs/MOBILE_READINESS.md`.

## Problemas comunes

Ver la tabla de problemas comunes (manual y Docker) en **[`EJECUCION.md`](./EJECUCION.md#4-problemas-comunes-ambas-vías)**.

## Pendientes conocidos (no bloquean el uso, quedan documentados)

- Endpoint de cambio de contraseña y gestión de sesiones/dispositivos activos.
- Restringir CORS por entorno antes de llevar a producción.
- Aprobación/negación de permisos (módulo externo, fuera del alcance original).
- Push notifications y sincronización offline para la futura app móvil (fuera de alcance de este backend).

Ver `timetracker-backend/docs/REQUIREMENTS.md` sección 10 para el detalle completo.
