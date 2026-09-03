import { Pool } from "pg";
import crypto from "crypto";

export interface RefreshTokenValido {
  id: string;
  usuarioId: string;
}

export class RefreshTokenRepository {
  constructor(private readonly pool: Pool) {}

  private hash(tokenPlano: string): string {
    return crypto.createHash("sha256").update(tokenPlano).digest("hex");
  }

  async crear(usuarioId: string, tokenPlano: string, expiraEn: Date): Promise<void> {
    await this.pool.query(
      `INSERT INTO refresh_tokens (usuario_id, token_hash, expira_en) VALUES ($1, $2, $3)`,
      [usuarioId, this.hash(tokenPlano), expiraEn]
    );
  }

  /** Devuelve el registro solo si existe, no está revocado y no ha expirado. */
  async buscarValido(tokenPlano: string): Promise<RefreshTokenValido | null> {
    const { rows } = await this.pool.query(
      `SELECT id, usuario_id, expira_en, revocado FROM refresh_tokens WHERE token_hash = $1`,
      [this.hash(tokenPlano)]
    );
    const fila = rows[0];
    if (!fila || fila.revocado || new Date(fila.expira_en) < new Date()) return null;
    return { id: fila.id, usuarioId: fila.usuario_id };
  }

  async revocarPorId(id: string): Promise<void> {
    await this.pool.query(`UPDATE refresh_tokens SET revocado = true WHERE id = $1`, [id]);
  }

  async revocarPorToken(tokenPlano: string): Promise<void> {
    await this.pool.query(`UPDATE refresh_tokens SET revocado = true WHERE token_hash = $1`, [this.hash(tokenPlano)]);
  }
}
