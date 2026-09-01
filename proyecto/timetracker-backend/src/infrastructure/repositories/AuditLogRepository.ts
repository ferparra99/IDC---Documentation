import { Pool } from "pg";

export interface RegistroAuditoria {
  entidad: string;
  entidadId: string;
  usuarioId: string;
  valorAnterior: unknown;
  valorNuevo: unknown;
  motivo?: string | null;
}

export class AuditLogRepository {
  constructor(private readonly pool: Pool) {}

  async registrar(r: RegistroAuditoria): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_log (entidad, entidad_id, usuario_id, valor_anterior, valor_nuevo, motivo)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [r.entidad, r.entidadId, r.usuarioId, JSON.stringify(r.valorAnterior), JSON.stringify(r.valorNuevo), r.motivo ?? null]
    );
  }

  async historialDe(entidad: string, entidadId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM audit_log WHERE entidad = $1 AND entidad_id = $2 ORDER BY fecha_cambio DESC`,
      [entidad, entidadId]
    );
    return rows;
  }
}
