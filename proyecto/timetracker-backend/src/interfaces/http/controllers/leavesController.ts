import { Request, Response } from "express";
import { container } from "../container";
import { ValidacionError } from "../../../domain/errors/DomainError";
import { NuevoPermisoDTO } from "../../../domain/entities/PermisoTypes";

function extraerDTO(body: unknown): NuevoPermisoDTO {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!b.fechaSolicitud || !b.horas || !b.tipo || !b.descripcion) {
    throw new ValidacionError(
      "Los campos 'fechaSolicitud', 'horas', 'tipo' y 'descripcion' son obligatorios."
    );
  }
  return {
    fechaSolicitud: String(b.fechaSolicitud),
    horas: Number(b.horas),
    tipo: b.tipo as NuevoPermisoDTO["tipo"],
    descripcion: String(b.descripcion),
  };
}

export async function crear(req: Request, res: Response): Promise<void> {
  const dto = extraerDTO(req.body);
  const permiso = await container.permisoService.crear(req.usuario!.sub, dto);
  res.status(201).json({ data: permiso });
}

export async function editar(req: Request, res: Response): Promise<void> {
  const dto = extraerDTO(req.body);
  const permiso = await container.permisoService.editar(req.params.id, req.usuario!.sub, dto);
  res.status(200).json({ data: permiso });
}

export async function preview(req: Request, res: Response): Promise<void> {
  const resultado = await container.permisoService.obtenerPreview(
    req.params.id,
    req.usuario!.sub,
    req.usuario!.rol === "administrador"
  );
  res.status(200).json({ data: resultado });
}

export async function enviar(req: Request, res: Response): Promise<void> {
  const permiso = await container.permisoService.enviar(req.params.id, req.usuario!.sub);
  res.status(200).json({ data: permiso });
}

export async function listar(req: Request, res: Response): Promise<void> {
  const desde = req.query.desde as string | undefined;
  const hasta = req.query.hasta as string | undefined;
  const permisos = await container.permisoService.listar(req.usuario!.sub, desde, hasta);
  res.status(200).json({ data: permisos });
}

export async function pendientes(req: Request, res: Response): Promise<void> {
  if (req.usuario!.rol !== "administrador") {
    const err: any = new Error("Se requiere rol administrador.");
    err.code = "NO_AUTORIZADO"; err.status = 403; throw err;
  }
  const permisos = await container.permisoService.listarPendientes();
  res.status(200).json({ data: permisos });
}

export async function listarTodosAdmin(req: Request, res: Response): Promise<void> {
  if (req.usuario!.rol !== "administrador") {
    const err: any = new Error("Se requiere rol administrador.");
    err.code = "NO_AUTORIZADO"; err.status = 403; throw err;
  }
  const permisos = await container.permisoService.listarTodosAdmin();
  res.status(200).json({ data: permisos });
}

export async function aprobar(req: Request, res: Response): Promise<void> {
  if (req.usuario!.rol !== "administrador") {
    const err: any = new Error("Se requiere rol administrador.");
    err.code = "NO_AUTORIZADO"; err.status = 403; throw err;
  }
  const permiso = await container.permisoService.aprobar(req.params.id);
  res.status(200).json({ data: permiso });
}

export async function rechazar(req: Request, res: Response): Promise<void> {
  if (req.usuario!.rol !== "administrador") {
    const err: any = new Error("Se requiere rol administrador.");
    err.code = "NO_AUTORIZADO"; err.status = 403; throw err;
  }
  const permiso = await container.permisoService.rechazar(req.params.id);
  res.status(200).json({ data: permiso });
}
