import { Pool } from "pg";
import { RegistroJornadaProps } from "../../domain/entities/RegistroJornadaTypes";

interface FilaRegistroJornada {
  id: string;
  usuario_id: string;
  fecha: string;
  hora_inicio: Date | null;
  hora_fin: Date | null;
  estado: RegistroJornadaProps["estado"];
  descripcion_proyectos: string | null;
  horas_ordinarias: string;
  horas_extra_diurnas: string;
  horas_extra_nocturnas: string;
  horas_recargo_nocturno: string;
  horas_dominical_festivo: string;
  editado_manualmente: boolean;
}

function aProps(fila: FilaRegistroJornada): RegistroJornadaProps {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    fecha: fila.fecha,
    horaInicio: fila.hora_inicio,
    horaFin: fila.hora_fin,
    estado: fila.estado,
    descripcionProyectos: fila.descripcion_proyectos,
    horasOrdinarias: Number(fila.horas_ordinarias),
    horasExtraDiurnas: Number(fila.horas_extra_diurnas),
    horasExtraNocturnas: Number(fila.horas_extra_nocturnas),
    horasRecargoNocturno: Number(fila.horas_recargo_nocturno),
    horasDominicalFestivo: Number(fila.horas_dominical_festivo),
    editadoManualmente: fila.editado_manualmente,
  };
}

export class RegistroJornadaRepository {
  constructor(private readonly pool: Pool) {}

  async buscarPorId(id: string): Promise<RegistroJornadaProps | null> {
    const { rows } = await this.pool.query<FilaRegistroJornada>(
      "SELECT * FROM registro_jornada WHERE id = $1",
      [id]
    );
    return rows[0] ? aProps(rows[0]) : null;
  }

  async buscarPorUsuarioYFecha(usuarioId: string, fecha: string): Promise<RegistroJornadaProps | null> {
    const { rows } = await this.pool.query<FilaRegistroJornada>(
      "SELECT * FROM registro_jornada WHERE usuario_id = $1 AND fecha = $2",
      [usuarioId, fecha]
    );
    return rows[0] ? aProps(rows[0]) : null;
  }

  /** Jornadas activas (posiblemente de días anteriores) sin cerrar — docs/STATE_MACHINE.md 3.1. */
  async buscarActivasPorUsuario(usuarioId: string): Promise<RegistroJornadaProps[]> {
    const { rows } = await this.pool.query<FilaRegistroJornada>(
      "SELECT * FROM registro_jornada WHERE usuario_id = $1 AND estado = 'JORNADA_ACTIVA' ORDER BY fecha ASC",
      [usuarioId]
    );
    return rows.map(aProps);
  }

  async listarPorRango(usuarioId: string, desde: string, hasta: string): Promise<RegistroJornadaProps[]> {
    const { rows } = await this.pool.query<FilaRegistroJornada>(
      `SELECT * FROM registro_jornada
       WHERE usuario_id = $1 AND fecha BETWEEN $2 AND $3
       ORDER BY fecha ASC`,
      [usuarioId, desde, hasta]
    );
    return rows.map(aProps);
  }

  async crear(props: RegistroJornadaProps): Promise<RegistroJornadaProps> {
    const { rows } = await this.pool.query<FilaRegistroJornada>(
      `INSERT INTO registro_jornada (usuario_id, fecha, hora_inicio, estado)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [props.usuarioId, props.fecha, props.horaInicio, props.estado]
    );
    return aProps(rows[0]);
  }

  async guardar(props: RegistroJornadaProps): Promise<RegistroJornadaProps> {
    const { rows } = await this.pool.query<FilaRegistroJornada>(
      `UPDATE registro_jornada SET
         hora_inicio = $1,
         hora_fin = $2,
         estado = $3,
         descripcion_proyectos = $4,
         horas_ordinarias = $5,
         horas_extra_diurnas = $6,
         horas_extra_nocturnas = $7,
         horas_recargo_nocturno = $8,
         horas_dominical_festivo = $9,
         editado_manualmente = $10,
         actualizado_en = now()
       WHERE id = $11
       RETURNING *`,
      [
        props.horaInicio,
        props.horaFin,
        props.estado,
        props.descripcionProyectos,
        props.horasOrdinarias,
        props.horasExtraDiurnas,
        props.horasExtraNocturnas,
        props.horasRecargoNocturno,
        props.horasDominicalFestivo,
        props.editadoManualmente,
        props.id,
      ]
    );
    return aProps(rows[0]);
  }
}
