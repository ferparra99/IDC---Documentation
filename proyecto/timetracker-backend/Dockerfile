# syntax=docker/dockerfile:1

# ---- Stage 1: dependencias completas (incluye devDependencies, para compilar) ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- Stage 2: compilar TypeScript -> dist ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build \
  # tsc no copia archivos que no sean .ts: las migraciones .sql se copian
  # a mano para que el runtime compilado (dist/infrastructure/db/migrate.js)
  # las encuentre con la misma lógica de rutas relativas que en desarrollo.
  && cp -r src/infrastructure/db/migrations dist/infrastructure/db/migrations

# ---- Stage 3: dependencias SOLO de producción (más liviana, sin ts-node/typescript) ----
FROM node:20-alpine AS deps-prod
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Stage 4: imagen final de ejecución ----
# Corre todo (servidor + migraciones + seed + sync de festivos) desde JS ya
# compilado con `node`, nunca con `ts-node`. Se decidió así después de que
# `ts-node` fallara en tiempo de ejecución dentro de esta imagen base
# (`ERR_UNKNOWN_FILE_EXTENSION` al intentar cargar un .ts) — en vez de pelear
# con el registro del loader de ts-node dentro del contenedor, se elimina la
# dependencia por completo en runtime: además dejó la imagen final más
# liviana y segura (sin `typescript`/`ts-node` en producción).
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh \
  && addgroup -S app && adduser -S app -G app \
  && chown -R app:app /app
USER app

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/interfaces/http/server.js"]
