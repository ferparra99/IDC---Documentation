import { Pool } from "pg";

export interface FilaReporteHoras {
  fecha: string;
  usuarioNombre: string;
  horaInicio: Date | null;
  horaFin: Date | null;
  horasOrdinarias: number;
  horasExtraDiurnas: number;
  horasExtraNocturnas: number;
  horasRecargoNocturno: number;
  horasDominicalFestivo: number;
  descripcionProyectos: string | null;
}

export interface FilaReporteViaje {
  fecha: string;
  usuarioNombre: string;
  puntoPartida: string;
  puntoFinal: string;
  descripcion: string;
  valor: number;
}

/**
 * Repositorio de solo lectura dedicado a reportería (Fase 5). Se mantiene
 * separado de `RegistroJornadaRepository`/`ViajeRepository` (que gestionan
 * el ciclo de vida de sus propias entidades) porque estas consultas tienen
 * una forma distinta: JOIN con `usuarios` para el nombre del empleado y,
 * opcionalmente, sin filtrar por usuario (reporte consolidado de admin) —
 * mezclar esa responsabilidad en los repositorios de dominio violaría
 * Single Responsibility.
 */
export class ReportRepository {
  constructor(private readonly pool: Pool) {}

  async horasParaReporte(desde: string, hasta: string, usuarioId?: string): Promise<FilaReporteHoras[]> {
    const params: unknown[] = [desde, hasta];
    let filtroUsuario = "";
    if (usuarioId) {
      params.push(usuarioId);
      filtroUsuario = "AND rj.usuario_id = $3";
    }

    const { rows } = await this.pool.query(
      `SELECT rj.fecha, u.nombre AS usuario_nombre, rj.hora_inicio, rj.hora_fin,
              rj.horas_ordinarias, rj.horas_extra_diurnas, rj.horas_extra_nocturnas,
              rj.horas_recargo_nocturno, rj.horas_dominical_festivo, rj.descripcion_proyectos
       FROM registro_jornada rj
       JOIN usuarios u ON u.id = rj.usuario_id
       WHERE rj.fecha BETWEEN $1 AND $2
         AND rj.estado = 'JORNADA_FINALIZADA'
         ${filtroUsuario}
       ORDER BY u.nombre ASC, rj.fecha ASC`,
      params
    );

    return rows.map((r) => ({
      fecha: r.fecha,
      usuarioNombre: r.usuario_nombre,
      horaInicio: r.hora_inicio,
      horaFin: r.hora_fin,
      horasOrdinarias: Number(r.horas_ordinarias),
      horasExtraDiurnas: Number(r.horas_extra_diurnas),
      horasExtraNocturnas: Number(r.horas_extra_nocturnas),
      horasRecargoNocturno: Number(r.horas_recargo_nocturno),
      horasDominicalFestivo: Number(r.horas_dominical_festivo),
      descripcionProyectos: r.descripcion_proyectos,
    }));
  }

  async viajesParaReporte(desde: string, hasta: string, usuarioId?: string): Promise<FilaReporteViaje[]> {
    const params: unknown[] = [desde, hasta];
    let filtroUsuario = "";
    if (usuarioId) {
      params.push(usuarioId);
      filtroUsuario = "AND v.usuario_id = $3";
    }

    const { rows } = await this.pool.query(
      `SELECT v.fecha, u.nombre AS usuario_nombre, v.punto_partida, v.punto_final, v.descripcion, v.valor
       FROM viajes v
       JOIN usuarios u ON u.id = v.usuario_id
       WHERE v.fecha BETWEEN $1 AND $2 ${filtroUsuario}
       ORDER BY u.nombre ASC, v.fecha ASC`,
      params
    );

    return rows.map((r) => ({
      fecha: r.fecha,
      usuarioNombre: r.usuario_nombre,
      puntoPartida: r.punto_partida,
      puntoFinal: r.punto_final,
      descripcion: r.descripcion,
      valor: Number(r.valor),
    }));
  }
}
