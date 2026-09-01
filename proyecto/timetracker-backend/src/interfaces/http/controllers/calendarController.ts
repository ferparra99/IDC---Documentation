import { Request, Response } from "express";
import { container } from "../container";
import { ValidacionError, NoAutorizadoError } from "../../../domain/errors/DomainError";

export async function obtenerMes(req: Request, res: Response): Promise<void> {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes) {
    throw new ValidacionError("Los parámetros 'anio' y 'mes' son obligatorios.");
  }

  const usuarioIdSolicitado = (req.query.usuarioId as string | undefined) ?? req.usuario!.sub;
  if (usuarioIdSolicitado !== req.usuario!.sub && req.usuario!.rol !== "administrador") {
    throw new NoAutorizadoError("No puedes consultar el calendario de otro usuario.");
  }

  const dias = await container.calendarService.obtenerMes(usuarioIdSolicitado, anio, mes);
  res.status(200).json({ data: dias });
}
