#!/bin/sh
set -e
echo "[entrypoint] Spring Boot - Flyway migraciones se ejecutan automáticamente al arrancar"
echo "[entrypoint] RUN_SEED_ON_START=$RUN_SEED_ON_START (seed vía CommandLineRunner)"
echo "[entrypoint] Iniciando servidor..."
exec "$@"
