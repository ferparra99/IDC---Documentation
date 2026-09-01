import { Request, Response } from "express";
import { container } from "../container";
import { registroADTO } from "../mappers/attendanceMapper";
import { NoAutorizadoError, ValidacionError } from "../../../domain/errors/DomainError";

function usuarioIdEfectivo(req: Request): string {
  const solicitado = (req.query.usuarioId as string | undefined) ?? req.usuario!.sub;
  if (solicitado !== req.usuario!.sub && req.usuario!.rol !== "administrador") {
    throw new NoAutorizadoError("No puedes consultar información de otro usuario.");
  }
  return solicitado;
}

export async function obtenerEstadoHoy(req: Request, res: Response): Promise<void> {
  const resultado = await container.attendanceService.obtenerEstadoHoy(req.usuario!.sub);
  res.status(200).json({
    data: {
      estado: resultado.estado,
      registro: resultado.registro ? registroADTO(resultado.registro) : null,
    },
  });
}

export async function iniciar(req: Request, res: Response): Promise<void> {
  const registro = await container.attendanceService.iniciarJornada(req.usuario!.sub);
  res.status(201).json({ data: registroADTO(registro) });
}

export async function finalizar(req: Request, res: Response): Promise<void> {
  const { descripcionProyectos } = req.body ?? {};
  if (!descripcionProyectos) {
    throw new ValidacionError("El campo 'descripcionProyectos' es obligatorio para finalizar la jornada.");
  }
  const registro = await container.attendanceService.finalizarJornada(req.usuario!.sub, descripcionProyectos);
  res.status(200).json({ data: registroADTO(registro) });
}

export async function editar(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { horaInicio, horaFin, motivo } = req.body ?? {};
  if (!horaInicio || !horaFin || !motivo) {
    throw new ValidacionError("Los campos 'horaInicio', 'horaFin' y 'motivo' son obligatorios.");
  }

  const registro = await container.attendanceService.editarManual({
    registroId: id,
    horaInicio: new Date(horaInicio),
    horaFin: new Date(horaFin),
    motivo,
    solicitanteId: req.usuario!.sub,
    solicitanteEsAdmin: req.usuario!.rol === "administrador",
  });

  res.status(200).json({ data: registroADTO(registro) });
}

export async function listar(req: Request, res: Response): Promise<void> {
  const desde = req.query.desde as string;
  const hasta = req.query.hasta as string;
  if (!desde || !hasta) {
    throw new ValidacionError("Los parámetros 'desde' y 'hasta' (YYYY-MM-DD) son obligatorios.");
  }
  const usuarioId = usuarioIdEfectivo(req);
  const registros = await container.attendanceService.listar(usuarioId, desde, hasta);
  res.status(200).json({ data: registros.map(registroADTO) });
}

export async function resumenSemanal(req: Request, res: Response): Promise<void> {
  const desde = req.query.desde as string;
  const hasta = req.query.hasta as string;
  if (!desde || !hasta) {
    throw new ValidacionError("Los parámetros 'desde' y 'hasta' (YYYY-MM-DD, lunes a domingo) son obligatorios.");
  }
  const usuarioId = usuarioIdEfectivo(req);
  const resumen = await container.attendanceService.resumenSemanal(usuarioId, desde, hasta);
  res.status(200).json({ data: resumen });
}
