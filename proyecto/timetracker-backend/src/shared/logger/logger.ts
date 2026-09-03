import pino from "pino";
import { env } from "../config/env";

/**
 * Logger central del backend. Regla de trabajo obligatoria (ver
 * docs/REQUIREMENTS.md sección 0): TODO código nuevo usa `logger`, nunca
 * `console.log`/`console.error` directamente, para que la salida sea
 * uniforme, tenga nivel/timestamp/contexto, y pueda redirigirse a un
 * agregador de logs en producción sin tocar el código de negocio.
 *
 * Niveles (equivalentes a SLF4J/Logback en Java):
 *   - logger.debug(...)  detalle de diagnóstico, solo útil en desarrollo.
 *   - logger.info(...)   evento de negocio relevante (jornada iniciada,
 *                        permiso enviado, login exitoso, etc.) — el
 *                        equivalente directo al `log.info` de Java.
 *   - logger.warn(...)   algo inesperado pero no roto (ej. intento de
 *                        acceso no autorizado).
 *   - logger.error(...)  excepción o fallo real; siempre pasar el error
 *                        como primer argumento: `logger.error(err, "mensaje")`.
 *
 * En desarrollo (`NODE_ENV != production`) se imprime formateado y con color
 * vía `pino-pretty`; en producción se imprime JSON estructurado (una línea
 * por evento), listo para un colector de logs.
 */
export const logger = pino({
  level: env.logLevel,
  transport:
    env.nodeEnv !== "production"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "yyyy-mm-dd HH:MM:ss", ignore: "pid,hostname" },
        }
      : undefined,
});
