# Esquema de Base de Datos — PostgreSQL

> Documento complementario de `REQUIREMENTS.md`. Leer ese documento primero para contexto de negocio antes de usar este esquema.

## Convenciones
- Tipo `id`: `UUID` (generado con `gen_random_uuid()`, extensión `pgcrypto`), no autoincremental, para evitar exponer secuencias y facilitar sincronización futura con app móvil offline-first.
- Todas las tablas tienen `creado_en` / `actualizado_en` (`TIMESTAMPTZ`, zona horaria `America/Bogota` en la aplicación, almacenado en UTC).
- Enums se implementan como `CHECK` constraints o tipos `ENUM` de Postgres (se recomienda `ENUM` para los estados de la máquina de estados, ya que ahí sí queremos que la BD rechace valores inválidos a nivel de esquema).

---

## 1. `usuarios`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `nombre` | VARCHAR(150) | |
| `email` | VARCHAR(150) UNIQUE | |
| `password_hash` | VARCHAR(255) | bcrypt/argon2 |
| `rol` | ENUM(`empleado`,`administrador`) | |
| `activo` | BOOLEAN DEFAULT true | |
| `creado_en` | TIMESTAMPTZ | |
| `actualizado_en` | TIMESTAMPTZ | |

---

## 2. `configuracion_sistema`

Almacena las variables de sistema (sección 4 de `REQUIREMENTS.md`) **versionadas en el tiempo**, porque los porcentajes legales cambian por calendario.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `clave` | VARCHAR(80) | ej. `horasMinimasSemanales`, `recargoNocturno` |
| `valor` | JSONB | permite número, string u objeto según el parámetro |
| `vigente_desde` | DATE | |
| `vigente_hasta` | DATE NULL | NULL = vigente actualmente |
| `creado_por` | UUID FK → `usuarios.id` | |
| `creado_en` | TIMESTAMPTZ | |

> Regla de negocio: nunca se hace `UPDATE` sobre un registro vigente; se cierra (`vigente_hasta`) y se inserta una nueva fila. Así el cálculo de horas de fechas pasadas sigue usando el valor correcto para esa fecha.

**Índice:** `UNIQUE (clave, vigente_desde)`, más índice sobre `(clave, vigente_hasta)` para búsquedas de "valor vigente hoy".

---

## 3. `registro_jornada`

Tabla central del módulo de fichaje (5.1) y calendario (5.2).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `usuario_id` | UUID FK → `usuarios.id` | |
| `fecha` | DATE | día calendario al que pertenece el registro |
| `hora_inicio` | TIMESTAMPTZ | capturada por el servidor al presionar "Iniciar jornada" |
| `hora_fin` | TIMESTAMPTZ NULL | capturada al presionar "Finalizar jornada" |
| `estado` | ENUM(`SIN_INICIAR`,`JORNADA_ACTIVA`,`JORNADA_FINALIZADA`,`EN_PERMISO`) | ver `STATE_MACHINE.md` |
| `descripcion_proyectos` | TEXT NULL | obligatorio al finalizar |
| `horas_ordinarias` | NUMERIC(5,2) | calculado |
| `horas_extra_diurnas` | NUMERIC(5,2) | calculado |
| `horas_extra_nocturnas` | NUMERIC(5,2) | calculado |
| `horas_recargo_nocturno` | NUMERIC(5,2) | calculado (no extra, solo recargo) |
| `horas_dominical_festivo` | NUMERIC(5,2) | calculado |
| `editado_manualmente` | BOOLEAN DEFAULT false | true si se ajustó desde el calendario (5.2) |
| `creado_en` | TIMESTAMPTZ | |
| `actualizado_en` | TIMESTAMPTZ | |

**Índice:** `UNIQUE (usuario_id, fecha)` — un solo registro de jornada "principal" por usuario/día. (Si en el futuro se requieren múltiples turnos por día, se debe evaluar romper esta restricción; ver "Pendientes".)

---

## 4. `permisos` (Fase 3)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `usuario_id` | UUID FK | |
| `fecha_solicitud` | DATE | día al que aplica el permiso |
| `horas` | NUMERIC(4,2) | horas que cubre el permiso |
| `tipo` | ENUM(`PARCIAL`,`COMPLETO`) | |
| `descripcion` | TEXT | |
| `estado` | ENUM(`BORRADOR`,`ENVIADO`) | estados de este módulo (no confundir con aprobación, que vive en el módulo externo). Simplificado en la implementación de Fase 3 respecto al diseño original de tres estados — ver `CHANGELOG.md` |
| `creado_en` | TIMESTAMPTZ | |
| `actualizado_en` | TIMESTAMPTZ | |

> Nota: el estado de **aprobación/negación** (`APROBADO`/`RECHAZADO`) pertenece al módulo externo mencionado en los requerimientos; aquí solo se modela el ciclo de creación/envío de la solicitud. Se sugiere una FK/relación lógica (`permiso_id`) desde ese otro módulo hacia esta tabla, no al revés, para no acoplar este módulo a uno que aún no existe.

---

## 5. `viajes` (Fase 4)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `usuario_id` | UUID FK | |
| `fecha` | DATE | |
| `punto_partida` | VARCHAR(255) | |
| `punto_final` | VARCHAR(255) | |
| `descripcion` | TEXT | motivo del viaje |
| `valor` | NUMERIC(10,2) DEFAULT 5000 | editable, valor por defecto desde `configuracion_sistema.valorViajePorDefecto` al crear |
| `creado_en` | TIMESTAMPTZ | |
| `actualizado_en` | TIMESTAMPTZ | |

---

## 6. `festivos` (cache local de la librería de festivos)

| Columna | Tipo | Notas |
|---|---|---|
| `fecha` | DATE PK | |
| `nombre` | VARCHAR(150) | |
| `pais` | VARCHAR(2) DEFAULT 'CO' | |
| `sincronizado_en` | TIMESTAMPTZ | última vez que se refrescó desde la librería/fuente |

> Se cachea localmente (en vez de calcular en cada request) para que el cálculo de recargos dominical/festivo sea determinístico y auditable, incluso si la librería externa cambia de versión.

---

## 7. `audit_log`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `entidad` | VARCHAR(50) | ej. `registro_jornada` |
| `entidad_id` | UUID | |
| `usuario_id` | UUID FK → `usuarios.id` | quién hizo el cambio |
| `fecha_cambio` | TIMESTAMPTZ | |
| `valor_anterior` | JSONB | |
| `valor_nuevo` | JSONB | |
| `motivo` | TEXT NULL | |

**Índice:** `(entidad, entidad_id, fecha_cambio)` para reconstruir el historial de un registro específico.

---

## 8. `refresh_tokens` (Fase 6 — sesiones largas para app móvil)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `usuario_id` | UUID FK → `usuarios.id` | |
| `token_hash` | VARCHAR(64) UNIQUE | SHA-256 hex del token; el token en texto plano nunca se guarda, solo se le entrega al cliente una vez |
| `expira_en` | TIMESTAMPTZ | por defecto 30 días desde su emisión |
| `revocado` | BOOLEAN | `true` tras logout o tras usarse en un `refresh` (rotación) |
| `creado_en` | TIMESTAMPTZ | |

Ver `docs/MOBILE_READINESS.md` para el razonamiento completo de por qué se agregó (sesiones largas + revocación real, algo que un JWT solo no permite).

---

## Diagrama relacional (resumen textual)

```
usuarios (1) ──< (N) registro_jornada
usuarios (1) ──< (N) permisos
usuarios (1) ──< (N) viajes
usuarios (1) ──< (N) audit_log            (usuario_id = quién editó)
usuarios (1) ──< (N) refresh_tokens
configuracion_sistema                     (independiente, versionada por fecha)
festivos                                  (independiente, consultada por fecha)
```

## Pendientes de este esquema
- [ ] Definir si `registro_jornada` debe soportar múltiples turnos por día (hoy asumido 1:1 usuario/fecha).
- [ ] Definir estrategia de particionamiento de `audit_log` si el volumen crece mucho (por fecha, ej. partición mensual).
