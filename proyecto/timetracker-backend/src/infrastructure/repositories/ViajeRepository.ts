import { Pool } from "pg";
import { ViajeProps } from "../../domain/entities/ViajeTypes";

interface FilaViaje {
  id: string;
  usuario_id: string;
  fecha: string;
  punto_partida: string;
  punto_final: string;
  descripcion: string;
  valor: string;
}

function aProps(fila: FilaViaje): ViajeProps {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    fecha: fila.fecha,
    puntoPartida: fila.punto_partida,
    puntoFinal: fila.punto_final,
    descripcion: fila.descripcion,
    valor: Number(fila.valor),
  };
}

export class ViajeRepository {
  constructor(private readonly pool: Pool) {}

  async crear(props: ViajeProps): Promise<ViajeProps> {
    const { rows } = await this.pool.query<FilaViaje>(
      `INSERT INTO viajes (usuario_id, fecha, punto_partida, punto_final, descripcion, valor)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [props.usuarioId, props.fecha, props.puntoPartida, props.puntoFinal, props.descripcion, props.valor]
    );
    return aProps(rows[0]);
  }

  async guardar(props: ViajeProps): Promise<ViajeProps> {
    const { rows } = await this.pool.query<FilaViaje>(
      `UPDATE viajes SET
         fecha = $1, punto_partida = $2, punto_final = $3, descripcion = $4, valor = $5, actualizado_en = now()
       WHERE id = $6
       RETURNING *`,
      [props.fecha, props.puntoPartida, props.puntoFinal, props.descripcion, props.valor, props.id]
    );
    return aProps(rows[0]);
  }

  async buscarPorId(id: string): Promise<ViajeProps | null> {
    const { rows } = await this.pool.query<FilaViaje>("SELECT * FROM viajes WHERE id = $1", [id]);
    return rows[0] ? aProps(rows[0]) : null;
  }

  async eliminar(id: string): Promise<void> {
    await this.pool.query("DELETE FROM viajes WHERE id = $1", [id]);
  }

  async listarPorRango(usuarioId: string, desde: string, hasta: string): Promise<ViajeProps[]> {
    const { rows } = await this.pool.query<FilaViaje>(
      `SELECT * FROM viajes WHERE usuario_id = $1 AND fecha BETWEEN $2 AND $3 ORDER BY fecha ASC, creado_en ASC`,
      [usuarioId, desde, hasta]
    );
    return rows.map(aProps);
  }

  /** Para reportería (Fase 5): todos los viajes de todos los usuarios en un rango. */
  async listarTodosPorRango(desde: string, hasta: string): Promise<ViajeProps[]> {
    const { rows } = await this.pool.query<FilaViaje>(
      `SELECT * FROM viajes WHERE fecha BETWEEN $1 AND $2 ORDER BY fecha ASC, creado_en ASC`,
      [desde, hasta]
    );
    return rows.map(aProps);
  }
}
