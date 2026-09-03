import pinoHttp from "pino-http";
import { logger } from "../../../shared/logger/logger";

/**
 * Registra cada request HTTP (método, ruta, status, duración en ms) con el
 * mismo logger central — equivalente a un filtro/interceptor de logging en
 * un stack Java (ej. un `OncePerRequestFilter` con SLF4J).
 */
export const requestLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} -> ${res.statusCode} (${err.message})`,
  // No registrar el body (puede incluir password en /auth/login).
  serializers: { req: (req) => ({ method: req.method, url: req.url }) },
});
