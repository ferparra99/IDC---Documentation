# Sistema de Control de Jornada Laboral — Documento Maestro de Requerimientos

> **Este documento es la fuente única de verdad del proyecto.**
> Toda persona (humana o IA) que vaya a implementar, modificar o revisar código **debe leer este archivo completo antes de iniciar cualquier cambio**, para recontextualizarse sobre el estado, reglas y alcance del sistema.

---

## 0. Reglas de trabajo obligatorias

1. **Leer este documento primero.** Ningún cambio se inicia sin haber revisado la sección relevante aquí. Si el documento no cubre un caso, se debe actualizar antes o después de implementar el cambio.
2. **Principios SOLID y OOP.** Toda implementación debe seguir:
   - **S**ingle Responsibility, **O**pen/Closed, **L**iskov Substitution, **I**nterface Segregation, **D**ependency Inversion.
   - Diseño orientado a objetos: encapsulamiento, herencia solo cuando aporte valor real, polimorfismo, composición sobre herencia cuando aplique.
   - Buenas prácticas generales: nombres descriptivos, funciones pequeñas y con una sola responsabilidad, evitar duplicación (DRY), manejo explícito de errores, cobertura de pruebas para lógica de negocio crítica (cálculo de horas, recargos, validaciones).
3. **Trazabilidad de cambios obligatoria.** Cada cambio debe quedar registrado en `CHANGELOG.md` (o tabla de trazabilidad, ver sección 8) con: fecha, autor/agente, módulo afectado, descripción del cambio, motivo y referencia (issue/ticket si aplica). No se aceptan cambios "silenciosos".

---

## 1. Visión general del proyecto

Aplicación web (con evolución futura a app móvil nativa) para la gestión del tiempo laboral de los empleados de una empresa en Colombia. Cubre:

- Registro de entrada/salida (fichaje) con cálculo automático de horas ordinarias, extra y nocturnas.
- Visualización tipo calendario de horas trabajadas, editable.
- Solicitud de permisos (el flujo de aprobación/negación se implementa en un módulo aparte, fuera de este alcance inicial).
- Registro de viajes/desplazamientos laborales diarios.
- Parámetros de sistema configurables (horario laboral, horas mínimas semanales, etc.).
- Exportación de reportes a Excel, organizados por hojas.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React (Vite), TypeScript recomendado |
| Backend | Node.js + Express (API REST) |
| Base de datos | PostgreSQL |
| Autenticación | JWT (roles: empleado, administrador — extensible) |
| Reportería Excel | Librería tipo `exceljs` en backend |
| Despliegue objetivo | Web responsive ahora; arquitectura API-first para permitir consumo desde app móvil nativa (React Native sugerido) en una fase posterior |

**Justificación de arquitectura:** al planearse una app móvil nativa a futuro, el backend se diseña **API-first** (REST, sin lógica de negocio en el frontend) para que tanto la web como la futura app móvil consuman los mismos endpoints sin duplicar reglas de negocio.

### Estructura de carpetas sugerida (backend)
```
/src
  /modules
    /attendance      (fichaje, cálculo de horas)
    /leaves          (permisos)
    /trips           (viajes)
    /system-config   (parámetros/variables de sistema)
    /reports         (exportación Excel)
  /shared
    /domain          (entidades, value objects)
    /application     (casos de uso / servicios)
    /infrastructure  (repositorios, DB, integraciones)
  /interfaces
    /http            (controllers, rutas, DTOs)
```
Esta separación por capas (dominio / aplicación / infraestructura / interfaces) facilita cumplir SOLID (especialmente D y S) y mantener testeable la lógica de negocio.

---

## 3. Marco legal colombiano aplicable (referencia para la lógica de negocio)

> Basado en normativa vigente a agosto 2026 (Ley 2101 de 2021 y Ley 2466 de 2025). **Estos valores deben quedar parametrizados, no hardcodeados**, porque cambian por calendario legal.

- **Jornada máxima semanal:** 42 horas (vigente desde el 15 de julio de 2026, tras la reducción gradual de la Ley 2101 de 2021).
- **Horario nocturno:** desde las **7:00 p.m. hasta las 6:00 a.m.** (adelantado desde las 9:00 p.m. por la Ley 2466 de 2025, vigente desde el 25 de diciembre de 2025).
- **Recargos sobre la hora ordinaria:**
  - Hora extra diurna: **+25%**
  - Hora extra nocturna: **+75%**
  - Recargo nocturno (sin ser hora extra): **+35%**
  - Recargo dominical/festivo: **+90%** (vigente desde el 1 de julio de 2026; escala progresiva de la Ley 2466 de 2025, subirá a 100% el 1 de julio de 2027)
  - Hora extra dominical/festiva diurna: **+105%**
  - Hora extra dominical/festiva nocturna: **+155%**
- **Límites de horas extra:** máximo 2 horas diarias y 12 horas semanales.

**Implicación de diseño:** el módulo de cálculo de horas debe tener un **motor de reglas desacoplado** (Strategy/Policy pattern) que reciba estos porcentajes y límites como configuración, para poder actualizarlos sin tocar la lógica central cuando cambie la ley o el calendario progresivo.

---

## 4. Variables / Parámetros de sistema (configurables, no hardcodeados)

| Variable | Descripción | Valor inicial sugerido |
|---|---|---|
| `horaEntradaEstandar` | Hora estándar de inicio de jornada | 08:00 |
| `horaSalidaEstandar` | Hora estándar de fin de jornada | 17:00 |
| `horasMinimasSemanales` | Horas mínimas/objetivo semanal | 42 |
| `inicioHorarioNocturno` | Hora de inicio de franja nocturna | 19:00 |
| `finHorarioNocturno` | Hora de fin de franja nocturna | 06:00 |
| `recargoNocturno` | % recargo nocturno | 35% |
| `recargoExtraDiurna` | % recargo hora extra diurna | 25% |
| `recargoExtraNocturna` | % recargo hora extra nocturna | 75% |
| `recargoDominicalFestivo` | % recargo dominical/festivo | 90% |
| `maxHorasExtraDiarias` | Tope legal diario de horas extra | 2 |
| `maxHorasExtraSemanales` | Tope legal semanal de horas extra | 12 |
| `valorViajePorDefecto` | Valor inicial editable por viaje registrado | $5.000 COP |

Estas variables deben administrarse desde un módulo de configuración (solo accesible a rol administrador), versionado (para saber qué valor aplicaba en qué fecha, ya que la ley cambia por calendario).

---

## 5. Módulos funcionales

### 5.1 Módulo de Registro de Jornada (Fichaje)

**Objetivo:** capturar entrada y salida del empleado y calcular horas trabajadas, extra y nocturnas.

- Botón **"Iniciar jornada"**: captura fecha y hora exacta de inicio (servidor, no cliente, para evitar manipulación).
- Botón **"Finalizar jornada"**: captura fecha y hora exacta de fin.
  - Al finalizar, se solicita obligatoriamente una **descripción del/los proyecto(s) trabajados** ese día (campo de texto, puede permitir múltiples entradas de proyecto).
- El sistema calcula automáticamente, usando las variables de la sección 4:
  - Horas ordinarias.
  - Horas extra diurnas / nocturnas.
  - Horas con recargo nocturno (sin ser extra).
  - Horas dominicales/festivas si aplica.
- Reglas:
  - No se debe permitir iniciar una jornada si ya hay una activa sin cerrar.
  - Debe quedar bloqueada la edición directa del registro de fichaje una vez cerrado (las correcciones se hacen desde el módulo de visualización/edición, sección 5.2, quedando trazadas).

### 5.2 Módulo de Visualización y Edición de Horas

**Objetivo:** vista tipo calendario del tiempo trabajado, con edición visual.

- Vista calendario (día/semana/mes) mostrando los bloques de horas trabajadas por día.
- **Modo edición:** barras arrastrables (drag) para ajustar hora de inicio/fin dentro del día — sugerido usar librerías tipo `react-big-calendar`, `FullCalendar` o construir con `dnd-kit` sobre un timeline propio.
- Toda edición manual debe quedar trazada (quién editó, cuándo, valor anterior/nuevo) — ver sección 8.
- Panel de reporte resumido visible en esta pantalla:
  - Horas trabajadas en el periodo (semana actual por defecto).
  - Horas mínimas requeridas (parametrizadas, 42 h/semana).
  - Horas extra acumuladas.
  - Horas faltantes hasta cumplir el mínimo.

### 5.3 Módulo de Permisos

> Se implementa **después** de tener funcionando el módulo de horas, ya que depende de él (el permiso descuenta/ajusta horas).

- Formulario de solicitud con:
  - Día de solicitud.
  - Horas que tomará el permiso.
  - Tipo de permiso (select/textbox: **Parcial** / **Completo**).
  - Descripción del permiso (textbox).
- **Flujo de previsualización antes de enviar:**
  1. El empleado llena el formulario.
  2. Se muestra una pantalla de previsualización con: información del empleado + información del permiso.
  3. Dos botones: **Editar** (regresa al formulario con los datos precargados) y **Enviar** (dispara un popup de confirmación de envío).
  4. Al confirmar, la solicitud queda en estado "Pendiente" a la espera del módulo de aprobación (fuera de este alcance).
- Este módulo **no** implementa aprobación/negación — solo creación y previsualización de la solicitud.

### 5.4 Módulo de Viajes

**Objetivo:** registrar desplazamientos laborales realizados por el empleado en el día.

- Campos por viaje:
  - Día.
  - Punto de partida.
  - Punto final.
  - Descripción / motivo del viaje.
  - Valor (editable), con **valor inicial por defecto tomado de la variable de sistema `valorViajePorDefecto`** ($5.000 COP).
- Un empleado puede registrar **múltiples viajes por día**.
- Debe quedar asociado al empleado y a la fecha para poder cruzarse en el reporte Excel.

---

## 6. Reportería en Excel

Generación de un archivo `.xlsx` con **múltiples hojas**, como mínimo:

1. **"Horas laboradas"**: detalle diario/semanal por empleado — fecha, hora entrada, hora salida, horas ordinarias, horas extra diurnas, horas extra nocturnas, horas con recargo nocturno, horas dominicales/festivas, total del día, proyectos trabajados.
2. **"Viajes laborados"**: fecha, empleado, punto de partida, punto final, motivo, valor.

Consideraciones:
- Filtro por rango de fechas y por empleado (o todos, para rol administrador).
- Formato ordenado: encabezados con estilo, columnas autoajustadas, totales al final de cada hoja.
- Generado desde backend (no en el cliente) para mantener consistencia con la lógica de cálculo centralizada.

---

## 7. Roles y permisos de acceso (sugerido, a validar)

| Rol | Puede |
|---|---|
| Empleado | Fichar entrada/salida, ver y editar su propio calendario, solicitar permisos, registrar viajes, exportar su propio reporte |
| Administrador / RRHH | Todo lo anterior para cualquier empleado, configurar variables de sistema, exportar reportes globales, ver trazabilidad de cambios |

---

## 8. Trazabilidad de cambios

### 8.1 A nivel de proyecto (documentación)
Todo cambio de alcance, requerimiento o decisión técnica se registra en `CHANGELOG.md` con este formato:

```
## [Fecha] - Módulo afectado
- **Autor:** nombre o agente
- **Cambio:** descripción breve
- **Motivo:** por qué se hizo
- **Referencia:** issue/ticket (si aplica)
```

### 8.2 A nivel de datos (auditoría en la aplicación)
Toda edición manual sobre registros de horas, permisos o viajes debe guardarse en una tabla de auditoría (`audit_log`), con al menos:

| Campo | Descripción |
|---|---|
| `id` | Identificador del registro de auditoría |
| `entidad` | Tabla/entidad afectada (ej: `attendance_record`) |
| `entidad_id` | ID del registro afectado |
| `usuario_id` | Quién hizo el cambio |
| `fecha_cambio` | Timestamp del cambio |
| `valor_anterior` | JSON con el estado previo |
| `valor_nuevo` | JSON con el estado nuevo |
| `motivo` | Motivo del cambio (opcional pero recomendado) |

---

## 9. Fases sugeridas de implementación

1. **Fase 1 — Base:** modelo de datos, autenticación, variables de sistema, módulo de fichaje (5.1).
2. **Fase 2 — Visualización:** calendario y edición de horas con auditoría (5.2).
3. **Fase 3 — Permisos:** módulo de solicitud de permisos con previsualización (5.3).
4. **Fase 4 — Viajes:** módulo de registro de viajes (5.4).
5. **Fase 5 — Reportería:** exportación a Excel multi-hoja (6).
6. **Fase 6 — Preparación app móvil:** validar que todos los endpoints sean consumibles desde React Native sin cambios de lógica.

---

## 10. Pendientes / decisiones abiertas

- [ ] Definir si el módulo de aprobación de permisos (mencionado pero fuera de alcance) vivirá en el mismo backend o como servicio aparte.

## 10.1 Documentos complementarios

Este documento es la fuente única de verdad a nivel de alcance y reglas de negocio. El detalle técnico profundo vive en documentos aparte (leer también antes de tocar el área correspondiente):

- **`DATABASE_SCHEMA.md`** — esquema de base de datos (tablas, columnas, índices, versionamiento de configuración).
- **`API_CONTRACTS.md`** — contratos REST (endpoints, requests/responses, códigos de error).
- **`STATE_MACHINE.md`** — detalle formal de la máquina de estados de la jornada (diagrama, casos borde, referencia de implementación del patrón State).

### Decisiones ya tomadas (ver detalle en sección 11 y en `STATE_MACHINE.md`)
- ~~Gestor de estado en frontend~~ → **Patrón de diseño State**, sincronizado con backend.
- ~~Cálculo de festivos colombianos~~ → **Librería de festivos**, integrada al módulo de calendario (5.2), con distinción visual de sábados/domingos.
- ~~Zona horaria / formato de hora~~ → hora tomada **del servidor**, zona horaria **`America/Bogota`**, formato de visualización **24 horas**.
- ~~Cierre automático de jornadas olvidadas~~ → **No habrá cierre automático.** Una jornada sin cerrar permanece `JORNADA_ACTIVA` hasta que se cierre manualmente (detalle de este caso borde en `STATE_MACHINE.md` sección 3.1).
- ~~Integración de permisos con el módulo de horas~~ → confirmado que se define en **Fase 3**, al implementar el módulo de permisos.

---

## 11. Manejo de estado de la jornada (Patrón State)

**Decisión:** el ciclo de vida de la jornada laboral del empleado se modela con el **patrón de diseño State** (GoF), tanto en frontend como en backend, en lugar de un simple gestor de estado genérico (Redux/Zustand/Context). Esto porque el "estado de la jornada" no es solo UI: es una **máquina de estados de negocio** con transiciones válidas e inválidas que deben respetarse en ambos lados.

### 11.1 Estados de la jornada
- `SIN_INICIAR` — el empleado no ha fichado entrada hoy.
- `JORNADA_ACTIVA` — el empleado fichó entrada y aún no ha cerrado.
- `JORNADA_FINALIZADA` — el empleado cerró su jornada (con descripción de proyecto(s) ya registrada).
- `EN_PERMISO` — el empleado tiene un permiso activo que afecta el día (una vez exista el módulo de permisos).

### 11.2 Transiciones válidas
```
SIN_INICIAR      --iniciarJornada()-->  JORNADA_ACTIVA
JORNADA_ACTIVA   --finalizarJornada()--> JORNADA_FINALIZADA
JORNADA_FINALIZADA --(nuevo día)-->     SIN_INICIAR
SIN_INICIAR      --aplicarPermiso()-->  EN_PERMISO
```
Cualquier transición no listada (ej. `finalizarJornada()` estando en `SIN_INICIAR`) debe ser rechazada explícitamente por la clase de estado correspondiente, no con un `if` disperso en el controlador.

### 11.3 Implementación backend
- Cada estado se modela como una clase/objeto que implementa una interfaz común `JornadaState` con métodos como `iniciar()`, `finalizar(descripcionProyectos)`, `aplicarPermiso()`.
- La entidad `RegistroJornada` mantiene una referencia a su estado actual y delega el comportamiento a él (cumpliendo Open/Closed: agregar un nuevo estado no obliga a modificar los existentes).
- **El estado es la fuente de verdad** y vive en la base de datos (columna `estado` en `registro_jornada`, con enum/check constraint). El frontend nunca decide el estado por sí mismo: lo consulta y lo actualiza a través de la API, y la API es quien valida la transición mediante el patrón State.
- Toda transición de estado se registra también en el log de auditoría (sección 8.2), incluyendo estado anterior y nuevo.

### 11.4 Implementación frontend
- El frontend mantiene un **espejo** del estado actual (obtenido del backend) para decidir qué botón mostrar (`Iniciar jornada` / `Finalizar jornada`) y qué formularios habilitar.
- El frontend **no valida transiciones de negocio**; solo refleja el estado recibido y deshabilita acciones no permitidas en la UI como ayuda visual. La validación real siempre ocurre en backend.
- Se recomienda un hook/composable (ej. `useJornadaState()`) que encapsule la lectura del estado actual y el disparo de transiciones vía API, para no duplicar esta lógica en cada componente.

---

## 12. Calendario: festivos y fines de semana

- El módulo de visualización de horas (5.2) debe integrar una **librería de festivos colombianos** (ej. `colombia-holidays` o equivalente vigente al momento de implementar; validar mantenimiento activo antes de fijar la dependencia) para:
  - Marcar visualmente los días festivos en el calendario.
  - Alimentar el motor de reglas de recargos (sección 3) para aplicar el recargo dominical/festivo (+90%) cuando corresponda.
- **Sábados y domingos** deben mostrarse con un **color distintivo** en la vista de calendario, independientemente de si son festivo o no (el domingo además implica recargo dominical si se trabaja).
- Recomendación: resolver festivos en backend (fuente de verdad para el cálculo de recargos) y exponerlos como parte de la respuesta de la API del calendario, para que el frontend solo pinte lo que el backend le indica (evita desincronización entre el cálculo de nómina y lo que ve el usuario).

---

*Última actualización: 30 de agosto de 2026.*
