# syntax=docker/dockerfile:1

# ---- Stage 1: build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# La URL del backend se "hornea" en el bundle estático en build time (Vite
# reemplaza import.meta.env.VITE_API_BASE_URL en el código compilado, no hay
# forma de cambiarla después en runtime sin reconstruir la imagen). Se pasa
# como build-arg desde docker-compose para poder apuntar a otro backend sin
# tocar este Dockerfile.
ARG VITE_API_BASE_URL=http://localhost:3000/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- Stage 2: servir el build estático con nginx ----
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
