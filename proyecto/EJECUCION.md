# Requerimientos y Ejecución del Proyecto

Guía única de: qué necesitas instalado y los pasos exactos para levantar el sistema completo (backend + frontend + base de datos), **manualmente** o **con Docker**. Para el alcance funcional y las reglas de negocio, ver `timetracker-backend/docs/REQUIREMENTS.md` (fuente única de verdad del proyecto).

---

## 1. Requerimientos

### Opción A — Ejecución manual (sin Docker)
- **Node.js 20+** y npm
- **PostgreSQL 14+** corriendo localmente o accesible por red, con una base de datos vacía creada
- Puertos libres: `3000` (backend), `5173` (frontend), `5432` (Postgres, si es local)

### Opción B — Ejecución con Docker
- **Docker Engine 24+** y **Docker Compose v2** (`docker compose`, ya viene integrado en Docker Desktop y en instalaciones recientes de Docker Engine)
- No necesitas Node.js ni PostgreSQL instalados en tu máquina — todo corre en contenedores
- Puertos libres: `3000`, `5173`, `5432` (los tres son configurables si ya los tienes ocupados, ver sección 3)

---

## 2. Ejecución manual (sin Docker)

### 2.1 Base de datos

```bash
createdb timetracker
```

### 2.2 Backend

```bash
cd timetracker-backend
npm install
cp .env.example .env
```

Edita `.env`:

```
DATABASE_URL=postgres://usuario:password@localhost:5432/timetracker
JWT_SECRET=cambia-esto-por-un-secreto-largo-y-aleatorio
SEED_ADMIN_EMAIL=admin@empresa.com
SEED_ADMIN_PASSWORD=CambiarEnProduccion123
```

```bash
npm run migrate         # crea todas las tablas
npm run seed              # crea el usuario administrador y la configuración inicial
npm run sync:festivos    # (opcional) precalcula festivos del año actual y el siguiente
npm run dev                # API en http://localhost:3000
```

Verifica: `curl http://localhost:3000/health` → `{"data":{"status":"ok"}}`.

### 2.3 Frontend

En otra terminal:

```bash
cd timetracker-frontend
npm install
cp .env.example .env    # ya apunta a http://localhost:3000/api/v1 por defecto
npm run dev
```

Abre `http://localhost:5173`.

---

## 3. Ejecución con Docker

Todo el proyecto (Postgres + backend + frontend) se levanta con un solo comando desde la raíz (`proyecto/`), usando `docker-compose.yml`.

### 3.1 Configurar variables de entorno

```bash
cp .env.example .env
```

Edita el `.env` recién creado (en la raíz, **no** los `.env` internos de cada carpeta) y define al menos:

```
JWT_SECRET=cambia-esto-por-un-secreto-largo-y-aleatorio
```

El resto de variables ya tienen valores por defecto razonables para desarrollo (usuario/clave de Postgres, puertos, etc. — revísalas en `.env.example` si necesitas cambiarlas).

### 3.2 Primer arranque (con seed)

La primera vez, activa el seed para crear el usuario administrador y la configuración inicial:

```bash
# en el .env de la raíz:
RUN_SEED_ON_START=true
```

```bash
docker compose up --build
```

Esto construye las 3 imágenes (backend, frontend, y usa la imagen oficial `postgres:16-alpine`) y las levanta juntas. La primera vez tarda unos minutos (build de imágenes); las siguientes es casi inmediato.

**Después de este primer arranque, vuelve a poner `RUN_SEED_ON_START=false`** en el `.env` (el seed no rompe nada si corre de nuevo, pero no tiene sentido ejecutarlo en cada reinicio del contenedor).

### 3.3 Arranques siguientes

```bash
docker compose up
```

Para reconstruir las imágenes después de cambiar código:

```bash
docker compose up --build
```

Para parar todo:

```bash
docker compose down
```

Para parar todo **y borrar los datos de la base de datos** (empezar de cero):

```bash
docker compose down -v
```

### 3.4 Acceso

- Frontend: `http://localhost:5173` (o el puerto que hayas puesto en `FRONTEND_PORT`)
- Backend: `http://localhost:3000` (`FRONTEND_PORT`/`BACKEND_PORT` configurables en el `.env` de la raíz)
- Postgres: `localhost:5432` (accesible desde tu máquina host también, útil para conectarte con un cliente SQL a inspeccionar datos)

### 3.5 Cómo está armado (por si necesitas tocarlo)

- `docker-compose.yml` (raíz): orquesta los 3 servicios (`db`, `backend`, `frontend`).
- `timetracker-backend/Dockerfile`: build multi-stage (compila TypeScript, imagen final corre `docker-entrypoint.sh`, que ejecuta migraciones → opcionalmente seed → sincroniza festivos → arranca el servidor).
- `timetracker-frontend/Dockerfile`: build multi-stage (compila el bundle de Vite con la URL del backend "horneada" en build time vía `VITE_API_BASE_URL`, se sirve con `nginx`).
- Se optó por **3 imágenes separadas** en vez de un único Dockerfile monolítico, porque backend/frontend/DB son piezas independientes con ciclos de vida y tecnologías distintas (Node vs. nginx vs. Postgres) — es el patrón estándar para este tipo de arquitectura y permite reconstruir/escalar cada una por separado.

### 3.6 Ejecutar comandos sueltos dentro del contenedor del backend

```bash
docker compose exec backend npm run seed
docker compose exec backend npm run sync:festivos
docker compose exec backend sh   # abre una shell dentro del contenedor
```

---

## 4. Problemas comunes (ambas vías)

| Síntoma | Causa probable |
|---|---|
| `Falta la variable de entorno requerida: DATABASE_URL` | No copiaste/editaste el `.env` correspondiente |
| `ECONNREFUSED` al hacer login desde el frontend | El backend no está corriendo, o la URL configurada no coincide con el puerto real |
| Las tablas no existen / error de Postgres al iniciar sesión | Falta correr las migraciones (`npm run migrate` manual, o revisar logs de `docker compose up` — el entrypoint las corre solo) |
| `docker compose up` falla con "Debes definir JWT_SECRET" | No copiaste/editaste el `.env` de la raíz (paso 3.1) |
| El calendario no marca festivos | Corre `npm run sync:festivos` (manual) o `docker compose exec backend npm run sync:festivos` |
| Cambié código pero no se refleja en Docker | Falta reconstruir la imagen: `docker compose up --build` |

---

## 5. Nota sobre alcance de la validación de Docker

La configuración de Docker sigue patrones estándar y probados para Node.js + Vite + PostgreSQL. En la primera versión no se pudo ejecutar un `docker build`/`docker compose up` real (este entorno de trabajo no tiene Docker disponible), y eso dejó pasar un error real: el contenedor del backend fallaba al ejecutar las migraciones con `ERR_UNKNOWN_FILE_EXTENSION` al intentar cargar un `.ts` vía `ts-node` dentro de la imagen `node:20-alpine`.

**Ya está corregido** (ver `CHANGELOG.md`): el contenedor de producción ya no usa `ts-node` en ningún momento. El Dockerfile del backend compila todo con `tsc` en el build y corre los scripts de migración/seed/festivos con `node` sobre el JS ya compilado (`npm run migrate:prod`, etc.), copiando también los `.sql` de las migraciones a `dist/` en el build. Esto además redujo el tamaño de la imagen final, porque ya no necesita `ts-node`/`typescript` en producción.

Esta corrección sí se validó paso a paso simulando manualmente cada stage del Dockerfile (`npm ci` completo → `tsc` + copia de `.sql` → `npm ci --omit=dev` → ejecución de `migrate.js`/`seed.js`/`syncFestivos.js`/`server.js` con `node` puro, confirmando en cada uno que el único error posible era "no hay Postgres real aquí" — el comportamiento esperado fuera de un contenedor real). Aun así, **valida tú el primer `docker compose up --build`** con una base de datos real antes de confiar en esto para producción; si algo más aparece, es el siguiente punto a revisar.
