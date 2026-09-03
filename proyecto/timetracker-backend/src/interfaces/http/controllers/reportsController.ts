import { Request, Response } from "express";
import { container } from "../container";
import { ValidacionError, NoAutorizadoError } from "../../../domain/errors/DomainError";

export async function generarExcel(req: Request, res: Response): Promise<void> {
  const desde = req.query.desde as string;
  const hasta = req.query.hasta as string;
  if (!desde || !hasta) {
    throw new ValidacionError("Los parámetros 'desde' y 'hasta' (YYYY-MM-DD) son obligatorios.");
  }

  const esAdmin = req.usuario!.rol === "administrador";
  let usuarioId = req.query.usuarioId as string | undefined;

  if (!esAdmin) {
    if (usuarioId && usuarioId !== req.usuario!.sub) {
      throw new NoAutorizadoError("No puedes exportar el reporte de otro usuario.");
    }
    // Un empleado siempre exporta solo lo suyo, sin importar el query param.
    usuarioId = req.usuario!.sub;
  }
  // Si es administrador y no se especifica 'usuarioId', queda undefined ->
  // el reporte es el consolidado de todos los empleados (docs/API_CONTRACTS.md).

  const buffer = await container.reportService.generarExcel(desde, hasta, usuarioId);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="reporte_${desde}_a_${hasta}.xlsx"`);
  res.status(200).send(buffer);
}
