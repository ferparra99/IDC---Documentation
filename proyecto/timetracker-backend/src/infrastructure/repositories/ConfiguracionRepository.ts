import { Pool } from "pg";

export interface ConfiguracionItem {
  clave: string;
  valor: unknown;
  vigenteDesde: string;
}

export class ConfiguracionRepository {
  constructor(private readonly pool: Pool) {}

  /** Todas las claves con su valor vigente hoy (vigente_hasta IS NULL). */
  async obtenerTodasVigentes(): Promise<ConfiguracionItem[]> {
    const { rows } = await this.pool.query(
      `SELECT clave, valor, vigente_desde FROM configuracion_sistema WHERE vigente_hasta IS NULL ORDER BY clave`
    );
    return rows.map((r) => ({ clave: r.clave, valor: r.valor, vigenteDesde: r.vigente_desde }));
  }

  /** Valor vigente hoy de una sola clave, o null si no existe configuración para ella. */
  async obtenerVigente<T = unknown>(clave: string): Promise<T | null> {
    const { rows } = await this.pool.query(
      `SELECT valor FROM configuracion_sistema WHERE clave = $1 AND vigente_hasta IS NULL`,
      [clave]
    );
    return rows[0] ? (rows[0].valor as T) : null;
  }

  /**
   * Crea una nueva versión vigente para `clave`: cierra la versión anterior
   * (vigente_hasta = vigenteDesde - 1 día) e inserta la nueva. Nunca hace
   * UPDATE sobre una versión ya vigente (docs/DATABASE_SCHEMA.md sección 2),
   * para que el cálculo de horas de fechas pasadas no cambie retroactivamente.
   */
  async crearNuevaVersion(
    clave: string,
    valor: unknown,
    vigenteDesde: string,
    creadoPor: string
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE configuracion_sistema
         SET vigente_hasta = ($1::date - INTERVAL '1 day')::date
         WHERE clave = $2 AND vigente_hasta IS NULL`,
        [vigenteDesde, clave]
      );
      await client.query(
        `INSERT INTO configuracion_sistema (clave, valor, vigente_desde, creado_por)
         VALUES ($1, $2, $3, $4)`,
        [clave, JSON.stringify(valor), vigenteDesde, creadoPor]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
