# syntax=docker/dockerfile:1

# ---- Stage 1: instalar dependencias (incluye devDependencies, se necesitan para compilar) ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- Stage 2: compilar TypeScript -> dist ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Stage 3: imagen final de ejecución ----
# Nota: se conserva node_modules completo (con devDependencies) y la carpeta
# `src` porque los scripts `migrate`/`seed`/`sync:festivos` corren con
# `ts-node` directamente sobre `src` (así leen los .sql de las migraciones
# sin necesidad de un paso extra de copia). Es una imagen más pesada que si
# solo se copiara `dist` + dependencias de producción, a cambio de mantener
# un único mecanismo de migraciones (el mismo en local y en Docker) — para
# el tamaño de este proyecto es un trade-off razonable; si el tamaño de
# imagen se vuelve un problema, la migración a un runner de migraciones
# compilado es el siguiente paso natural.
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
COPY src ./src
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh \
  && addgroup -S app && adduser -S app -G app \
  && chown -R app:app /app
USER app

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/interfaces/http/server.js"]
