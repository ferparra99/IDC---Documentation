import { Pool } from "pg";
import { FestivoCalculado } from "../../domain/services/ColombianHolidaysService";

export class FestivoRepository {
  constructor(private readonly pool: Pool) {}

  async existeAnio(anio: number): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM festivos WHERE fecha >= $1 AND fecha <= $2 LIMIT 1`,
      [`${anio}-01-01`, `${anio}-12-31`]
    );
    return rows.length > 0;
  }

  async guardarVarios(festivos: FestivoCalculado[]): Promise<void> {
    if (festivos.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const f of festivos) {
        await client.query(
          `INSERT INTO festivos (fecha, nombre) VALUES ($1, $2)
           ON CONFLICT (fecha) DO UPDATE SET nombre = EXCLUDED.nombre, sincronizado_en = now()`,
          [f.fecha, f.nombre]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async buscarPorRango(desde: string, hasta: string): Promise<Map<string, string>> {
    const { rows } = await this.pool.query(
      `SELECT fecha, nombre FROM festivos WHERE fecha BETWEEN $1 AND $2`,
      [desde, hasta]
    );
    const mapa = new Map<string, string>();
    for (const r of rows) {
      const fecha = r.fecha instanceof Date ? r.fecha.toISOString().slice(0, 10) : r.fecha;
      mapa.set(fecha, r.nombre);
    }
    return mapa;
  }
}
