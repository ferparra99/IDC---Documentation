// Se ejecuta antes de cualquier archivo de test. `env.ts` exige DATABASE_URL
// y JWT_SECRET al importarse (falla rápido si faltan en ejecución real), así
// que los tests necesitan valores dummy para poder importar código que
// transitivamente importe `shared/config/env`. Ningún test de este proyecto
// toca una base de datos real (ver TESTING.md) — este valor nunca se usa
// para conectar a nada.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test_db";
process.env.JWT_SECRET ??= "secreto-de-pruebas-no-usar-en-produccion";
process.env.NODE_ENV ??= "test";
process.env.LOG_LEVEL ??= "silent";
