#!/bin/sh
set -e

echo "[entrypoint] Ejecutando migraciones..."
npm run migrate

if [ "$RUN_SEED_ON_START" = "true" ]; then
  echo "[entrypoint] RUN_SEED_ON_START=true -> ejecutando seed..."
  npm run seed
fi

echo "[entrypoint] Sincronizando festivos del año actual y el siguiente..."
npm run sync:festivos || echo "[entrypoint] Aviso: no se pudo sincronizar festivos (no bloquea el arranque)"

echo "[entrypoint] Iniciando servidor..."
exec "$@"
