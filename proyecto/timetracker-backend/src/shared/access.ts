import { Request } from "express";

/**
 * Centraliza chequeo de rol administrador y usuario efectivo.
 * Reemplaza la duplicación de usuarioIdEfectivo() en attendance/calendar/report/leave controllers.
 */
export function isAdmin(req: Request): boolean {
  const rol = (req as any).usuario?.rol;
  return rol === "administrador" || rol === "ADMIN";
}

export function usuarioEfectivo(req: Request, solicitado?: string): string {
  const actual = (req as any).usuario?.sub as string;
  const eff = solicitado && solicitado.trim() ? solicitado : actual;
  if (eff !== actual && !isAdmin(req)) {
    const err: any = new Error("No puedes consultar información de otro usuario.");
    err.code = "NO_AUTORIZADO";
    err.status = 403;
    throw err;
  }
  return eff;
}
