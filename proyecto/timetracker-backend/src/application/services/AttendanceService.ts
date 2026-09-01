import { RegistroJornadaRepository } from "../../infrastructure/repositories/RegistroJornadaRepository";
import { ConfiguracionRepository } from "../../infrastructure/repositories/ConfiguracionRepository";
import { AuditLogRepository } from "../../infrastructure/repositories/AuditLogRepository";
import { RegistroJornada } from "../../domain/entities/RegistroJornada";
import { nuevoRegistroJornada, RegistroJornadaProps } from "../../domain/entities/RegistroJornadaTypes";
import {
  JornadaYaActivaError,
  NoHayJornadaActivaError,
  NoAutorizadoError,
  NoEncontradoError,
  ValidacionError,
} from "../../domain/errors/DomainError";
import { fechaBogotaHoy, esFinDeSemanaBogotaFecha } from "../../shared/utils/tiempo";
import { obtenerConfiguracionVigente } from "./ConfiguracionVigenteFactory";

export interface EstadoHoyDTO {
  estado: RegistroJornadaProps["estado"];
  registro: RegistroJornadaProps | null;
}

export class AttendanceService {
  constructor(
    private readonly registros: RegistroJornadaRepository,
    private readonly configuracion: ConfiguracionRepository,
    private readonly auditoria: AuditLogRepository
  ) {}

  async obtenerEstadoHoy(usuarioId: string): Promise<EstadoHoyDTO> {
    const fecha = fechaBogotaHoy();
    const registro = await this.registros.buscarPorUsuarioYFecha(usuarioId, fecha);
    return { estado: registro?.estado ?? "SIN_INICIAR", registro };
  }

  async iniciarJornada(usuarioId: string): Promise<RegistroJornadaProps> {
    const fecha = fechaBogotaHoy();
    const existente = await this.registros.buscarPorUsuarioYFecha(usuarioId, fecha);

    if (existente) {
      // Ya existe un registro para hoy: solo puede estar activo o finalizado
      // (nunca SIN_INICIAR, porque esa fila no llega a persistirse en ese estado).
      throw new JornadaYaActivaError(
        existente.estado === "JORNADA_ACTIVA"
          ? "Ya tienes una jornada activa. Debes finalizarla antes de iniciar una nueva."
          : "Ya registraste tu jornada de hoy."
      );
    }

    const config = await obtenerConfiguracionVigente(this.configuracion);
    const props = nuevoRegistroJornada(usuarioId, fecha);
    const entidad = RegistroJornada.crear(props, config, esFinDeSemanaBogotaFecha(fecha));
    entidad.iniciar();

    return this.registros.crear(entidad.toProps());
  }

  async finalizarJornada(usuarioId: string, descripcionProyectos: string): Promise<RegistroJornadaProps> {
    const activas = await this.registros.buscarActivasPorUsuario(usuarioId);
    if (activas.length === 0) {
      throw new NoHayJornadaActivaError("No tienes ninguna jornada activa para finalizar.");
    }

    // Si por algún motivo hay más de una jornada activa (ver docs/STATE_MACHINE.md
    // 3.1: no hay cierre automático, así que pueden acumularse), se cierra primero
    // la más antigua (FIFO). Cerrar una jornada específica por id queda como
    // mejora futura si en la práctica esto resulta confuso para el usuario.
    const objetivo = activas[0];

    const config = await obtenerConfiguracionVigente(this.configuracion);
    // Nota: el festivo/domingo se evalúa sobre la fecha de INICIO de la jornada
    // (objetivo.fecha), no sobre "hoy". La detección de festivos colombianos
    // (más allá de fin de semana) se integra en Fase 2 junto al calendario.
    const entidad = RegistroJornada.crear(objetivo, config, esFinDeSemanaBogotaFecha(objetivo.fecha));
    entidad.finalizar(descripcionProyectos);

    return this.registros.guardar(entidad.toProps());
  }

  async listar(usuarioId: string, desde: string, hasta: string): Promise<RegistroJornadaProps[]> {
    return this.registros.listarPorRango(usuarioId, desde, hasta);
  }

  /**
   * Edición manual desde el calendario (barras arrastrables, módulo 5.2).
   * Solo aplica sobre jornadas ya `JORNADA_FINALIZADA` (no es una transición
   * de estado — ver comentario en `RegistroJornada.editarManualmente`).
   * Queda registrada en `audit_log` con el valor anterior y el nuevo.
   */
  async editarManual(params: {
    registroId: string;
    horaInicio: Date;
    horaFin: Date;
    motivo: string;
    solicitanteId: string;
    solicitanteEsAdmin: boolean;
  }): Promise<RegistroJornadaProps> {
    const { registroId, horaInicio, horaFin, motivo, solicitanteId, solicitanteEsAdmin } = params;

    if (!motivo || motivo.trim().length === 0) {
      throw new ValidacionError("El campo 'motivo' es obligatorio para editar un registro.");
    }
    if (horaFin <= horaInicio) {
      throw new ValidacionError("La hora de fin debe ser posterior a la hora de inicio.");
    }

    const existente = await this.registros.buscarPorId(registroId);
    if (!existente) {
      throw new NoEncontradoError("El registro de jornada no existe.");
    }
    if (existente.usuarioId !== solicitanteId && !solicitanteEsAdmin) {
      throw new NoAutorizadoError("No puedes editar el registro de otro usuario.");
    }

    const valorAnterior = { ...existente };

    const config = await obtenerConfiguracionVigente(this.configuracion);
    const entidad = RegistroJornada.crear(existente, config, esFinDeSemanaBogotaFecha(existente.fecha));
    entidad.editarManualmente(horaInicio, horaFin);

    const guardado = await this.registros.guardar(entidad.toProps());

    await this.auditoria.registrar({
      entidad: "registro_jornada",
      entidadId: guardado.id,
      usuarioId: solicitanteId,
      valorAnterior,
      valorNuevo: guardado,
      motivo,
    });

    return guardado;
  }

  async resumenSemanal(usuarioId: string, desdeLunes: string, hastaDomingo: string) {
    const registros = await this.registros.listarPorRango(usuarioId, desdeLunes, hastaDomingo);
    const horasMinimasSemanales =
      (await this.configuracion.obtenerVigente<number>("horasMinimasSemanales")) ?? 42;

    const horasTrabajadas = registros.reduce(
      (acc, r) =>
        acc +
        r.horasOrdinarias +
        r.horasExtraDiurnas +
        r.horasExtraNocturnas +
        r.horasRecargoNocturno +
        r.horasDominicalFestivo,
      0
    );
    const horasExtra = registros.reduce((acc, r) => acc + r.horasExtraDiurnas + r.horasExtraNocturnas, 0);
    const horasFaltantes = Math.max(0, horasMinimasSemanales - horasTrabajadas);

    return {
      horasTrabajadas: Math.round(horasTrabajadas * 100) / 100,
      horasMinimasSemanales,
      horasExtra: Math.round(horasExtra * 100) / 100,
      horasFaltantes: Math.round(horasFaltantes * 100) / 100,
    };
  }
}
