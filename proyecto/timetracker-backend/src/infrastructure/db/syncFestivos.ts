import { pool } from "./pool";
import { FestivoRepository } from "../repositories/FestivoRepository";
import { HolidaySyncService } from "../../application/services/HolidaySyncService";

async function main() {
  const anios = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
  if (anios.length === 0) {
    const actual = new Date().getFullYear();
    anios.push(actual, actual + 1);
  }

  const service = new HolidaySyncService(new FestivoRepository(pool));
  for (const anio of anios) {
    console.log(`Sincronizando festivos de ${anio} ...`);
    await service.asegurarAnioSincronizado(anio);
  }
  console.log("Listo.");
  await pool.end();
}

main().catch((err) => {
  console.error("Error sincronizando festivos:", err);
  process.exit(1);
});
