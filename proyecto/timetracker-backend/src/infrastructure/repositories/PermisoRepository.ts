import { Pool } from "pg";
import { PermisoProps } from "../../domain/entities/PermisoTypes";

interface FilaPermiso {
  id: string;
  usuario_id: string;
  fecha_solicitud: string;
  horas: string;
  tipo: PermisoProps["tipo"];
  descripcion: string;
  estado: PermisoProps["estado"];
}

function aProps(fila: FilaPermiso): PermisoProps {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    fechaSolicitud: fila.fecha_solicitud,
    horas: Number(fila.horas),
    tipo: fila.tipo,
    descripcion: fila.descripcion,
    estado: fila.estado,
  };
}

export class PermisoRepository {
  constructor(private readonly pool: Pool) {}

  async crear(props: PermisoProps): Promise<PermisoProps> {
    const { rows } = await this.pool.query<FilaPermiso>(
      `INSERT INTO permisos (usuario_id, fecha_solicitud, horas, tipo, descripcion, estado)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [props.usuarioId, props.fechaSolicitud, props.horas, props.tipo, props.descripcion, props.estado]
    );
    return aProps(rows[0]);
  }

  async guardar(props: PermisoProps): Promise<PermisoProps> {
    const { rows } = await this.pool.query<FilaPermiso>(
      `UPDATE permisos SET
         fecha_solicitud = $1, horas = $2, tipo = $3, descripcion = $4, estado = $5, actualizado_en = now()
       WHERE id = $6
       RETURNING *`,
      [props.fechaSolicitud, props.horas, props.tipo, props.descripcion, props.estado, props.id]
    );
    return aProps(rows[0]);
  }

  async buscarPorId(id: string): Promise<PermisoProps | null> {
    const { rows } = await this.pool.query<FilaPermiso>("SELECT * FROM permisos WHERE id = $1", [id]);
    return rows[0] ? aProps(rows[0]) : null;
  }

  async listarPorUsuario(usuarioId: string, desde?: string, hasta?: string): Promise<PermisoProps[]> {
    if (desde && hasta) {
      const { rows } = await this.pool.query<FilaPermiso>(
        `SELECT * FROM permisos WHERE usuario_id = $1 AND fecha_solicitud BETWEEN $2 AND $3 ORDER BY fecha_solicitud DESC`,
        [usuarioId, desde, hasta]
      );
      return rows.map(aProps);
    }
    const { rows } = await this.pool.query<FilaPermiso>(
      `SELECT * FROM permisos WHERE usuario_id = $1 ORDER BY fecha_solicitud DESC`,
      [usuarioId]
    );
    return rows.map(aProps);
  }
}
