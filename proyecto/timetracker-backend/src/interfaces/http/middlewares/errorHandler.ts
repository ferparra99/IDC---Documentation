import { Request, Response, NextFunction } from "express";
import { DomainError } from "../../../domain/errors/DomainError";
import { logger } from "../../../shared/logger/logger";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof DomainError) {
    logger.warn({ code: err.code, path: req.path }, err.message);
    res.status(err.httpStatus).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  logger.error(err, "Error no controlado");
  res.status(500).json({
    error: { code: "ERROR_INTERNO", message: "Ocurrió un error inesperado." },
  });
}

/** Envuelve un controlador async para que sus rechazos lleguen a errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
