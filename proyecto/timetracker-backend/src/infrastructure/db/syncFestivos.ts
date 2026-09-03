import { pool } from "./pool";
import { FestivoRepository } from "../repositories/FestivoRepository";
import { HolidaySyncService } from "../../application/services/HolidaySyncService";
import { logger } from "../../shared/logger/logger";

async function main() {
  const anios = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
  if (anios.length === 0) {
    const actual = new Date().getFullYear();
    anios.push(actual, actual + 1);
  }

  const service = new HolidaySyncService(new FestivoRepository(pool));
  for (const anio of anios) {
    logger.info(`Sincronizando festivos de ${anio} ...`);
    await service.asegurarAnioSincronizado(anio);
  }
  logger.info("Sincronización de festivos completada.");
  await pool.end();
}

main().catch((err) => {
  logger.error(err, "Error sincronizando festivos");
  process.exit(1);
});
