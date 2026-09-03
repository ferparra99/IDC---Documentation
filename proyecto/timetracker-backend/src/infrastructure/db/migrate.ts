import fs from "fs";
import path from "path";
import { pool } from "./pool";
import { logger } from "../../shared/logger/logger";

const CARPETA_MIGRACIONES = path.join(__dirname, "migrations");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        nombre_archivo VARCHAR(255) PRIMARY KEY,
        aplicado_en TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const { rows } = await client.query("SELECT nombre_archivo FROM schema_migrations");
    const aplicadas = new Set(rows.map((r) => r.nombre_archivo));

    const archivos = fs
      .readdirSync(CARPETA_MIGRACIONES)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const archivo of archivos) {
      if (aplicadas.has(archivo)) {
        logger.debug(`(sin cambios) ${archivo}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(CARPETA_MIGRACIONES, archivo), "utf-8");
      logger.info(`Aplicando migración ${archivo} ...`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (nombre_archivo) VALUES ($1)", [archivo]);
        await client.query("COMMIT");
        logger.info(`Migración ${archivo} aplicada correctamente.`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    logger.info("Migraciones al día.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  logger.error(err, "Error ejecutando migraciones");
  process.exit(1);
});
