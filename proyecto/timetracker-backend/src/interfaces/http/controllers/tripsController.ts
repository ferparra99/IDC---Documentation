import { Request, Response } from "express";
import { container } from "../container";
import { ValidacionError, NoAutorizadoError } from "../../../domain/errors/DomainError";
import { NuevoViajeDTO } from "../../../domain/entities/ViajeTypes";

function extraerDTO(body: unknown): NuevoViajeDTO {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!b.fecha || !b.puntoPartida || !b.puntoFinal || !b.descripcion) {
    throw new ValidacionError(
      "Los campos 'fecha', 'puntoPartida', 'puntoFinal' y 'descripcion' son obligatorios."
    );
  }
  return {
    fecha: String(b.fecha),
    puntoPartida: String(b.puntoPartida),
    puntoFinal: String(b.puntoFinal),
    descripcion: String(b.descripcion),
    valor: b.valor !== undefined && b.valor !== null && b.valor !== "" ? Number(b.valor) : undefined,
  };
}

export async function crear(req: Request, res: Response): Promise<void> {
  const dto = extraerDTO(req.body);
  const viaje = await container.viajeService.crear(req.usuario!.sub, dto);
  res.status(201).json({ data: viaje });
}

export async function editar(req: Request, res: Response): Promise<void> {
  const dto = extraerDTO(req.body);
  const viaje = await container.viajeService.editar(
    req.params.id,
    req.usuario!.sub,
    req.usuario!.rol === "administrador",
    dto
  );
  res.status(200).json({ data: viaje });
}

export async function eliminar(req: Request, res: Response): Promise<void> {
  await container.viajeService.eliminar(req.params.id, req.usuario!.sub, req.usuario!.rol === "administrador");
  res.status(204).send();
}

export async function listar(req: Request, res: Response): Promise<void> {
  const desde = req.query.desde as string;
  const hasta = req.query.hasta as string;
  const usuarioIdSolicitado = (req.query.usuarioId as string | undefined) ?? req.usuario!.sub;
  if (!desde || !hasta) {
    throw new ValidacionError("Los parámetros 'desde' y 'hasta' (YYYY-MM-DD) son obligatorios.");
  }
  if (usuarioIdSolicitado !== req.usuario!.sub && req.usuario!.rol !== "administrador") {
    throw new NoAutorizadoError("No puedes consultar los viajes de otro usuario.");
  }
  const viajes = await container.viajeService.listar(usuarioIdSolicitado, desde, hasta);
  res.status(200).json({ data: viajes });
}
