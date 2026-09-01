import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../../shared/config/env";
import { TokenPayload } from "../../../application/services/AuthService";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: TokenPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "NO_AUTENTICADO", message: "Falta el token de autenticación." } });
    return;
  }

  const token = header.substring("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    req.usuario = payload;
    next();
  } catch {
    res.status(401).json({ error: { code: "TOKEN_INVALIDO", message: "El token es inválido o expiró." } });
  }
}

/** Restringe la ruta a un rol específico. Debe usarse después de authMiddleware. */
export function requiereRol(...roles: Array<"empleado" | "administrador">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      res.status(403).json({ error: { code: "NO_AUTORIZADO", message: "No tienes permisos para esta acción." } });
      return;
    }
    next();
  };
}
