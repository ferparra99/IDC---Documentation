import { Request, Response } from "express";
import { container } from "../container";

export async function obtenerConfiguracion(_req: Request, res: Response): Promise<void> {
  const items = await container.configService.obtenerVigentes();
  res.status(200).json({ data: items });
}

export async function actualizarConfiguracion(req: Request, res: Response): Promise<void> {
  const { clave } = req.params;
  const { valor, vigenteDesde } = req.body ?? {};
  await container.configService.actualizar(clave, valor, vigenteDesde, req.usuario!.sub);
  res.status(200).json({ data: { clave, valor, vigenteDesde } });
}
