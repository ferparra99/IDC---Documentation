# Timetracker — Frontend (Fase 2)

Aplicación React + Vite + TypeScript. Antes de tocar código, lee `../timetracker-backend/docs/REQUIREMENTS.md` (documento maestro del proyecto).

## Alcance de esta fase

- Login (consume `POST /auth/login`).
- Fichaje: iniciar/finalizar jornada (`AttendancePage`, consume los endpoints de Fase 1).
- Calendario mensual (`CalendarPage`):
  - Fines de semana y festivos colombianos con color distintivo (calculados en backend, ver `docs/STATE_MACHINE.md` y `ColombianHolidaysService`).
  - Panel de resumen (horas trabajadas, mínimo semanal, extra, faltantes).
  - Edición de horas por **barras arrastrables** (`DraggableHoursBar`, implementado con Pointer Events nativos, sin librería de drag-and-drop) para jornadas ya finalizadas — cada corrección exige un motivo y queda auditada en el backend (`audit_log`).

**Limitación conocida de esta fase:** la barra de edición asume que la jornada no cruza la medianoche (timeline de 00:00 a 23:59 de un solo día). Editar una jornada que cruzó la medianoche requiere hacerlo desde el backoffice/API directamente por ahora.

## Instalación

```bash
npm install
cp .env.example .env   # ajusta VITE_API_BASE_URL si el backend no corre en localhost:3000
npm run dev
```

Requiere el backend de `../timetracker-backend` corriendo (migrado y con seed ejecutado).

## Estructura

```
src/
  api/          cliente HTTP + tipos que reflejan los DTOs de la API
  context/      AuthContext (token JWT en localStorage)
  components/   MonthCalendar, DraggableHoursBar, SummaryPanel
  pages/        LoginPage, AttendancePage, CalendarPage
  utils/        utilidades de fecha (semana Bogotá, conversión minutos↔ISO)
```

No se usa gestor de estado global (Redux/Zustand): el estado de cada página vive en sus propios hooks, siguiendo la decisión de `REQUIREMENTS.md` de que **el backend es la fuente de verdad** del estado de negocio (patrón State) — el frontend solo lo refleja.
