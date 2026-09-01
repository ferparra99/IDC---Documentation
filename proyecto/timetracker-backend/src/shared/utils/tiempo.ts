import { DateTime } from "luxon";
import { ZONA_HORARIA } from "../config/env";

/**
 * Utilidades centralizadas de fecha/hora.
 *
 * Regla de negocio (docs/STATE_MACHINE.md sección 5):
 *  - La hora SIEMPRE se toma del reloj del servidor, nunca del cliente.
 *  - Zona horaria de referencia: America/Bogota.
 *  - Formato de visualización: 24 horas.
 *  - Almacenamiento interno: TIMESTAMPTZ en UTC (estándar de Postgres); la
 *    conversión a Bogotá/24h ocurre solo en la capa de presentación.
 */

/** Hora actual del servidor, en UTC (lo que se persiste en la base de datos). */
export function ahoraUtc(): Date {
  return DateTime.utc().toJSDate();
}

/** Fecha calendario (YYYY-MM-DD) de "hoy" en Bogotá, para agrupar registros por día. */
export function fechaBogotaHoy(): string {
  return DateTime.now().setZone(ZONA_HORARIA).toFormat("yyyy-MM-dd");
}

/** Fecha calendario (YYYY-MM-DD) en Bogotá correspondiente a un instante dado. */
export function fechaBogotaDe(fechaUtc: Date): string {
  return DateTime.fromJSDate(fechaUtc, { zone: "utc" })
    .setZone(ZONA_HORARIA)
    .toFormat("yyyy-MM-dd");
}

/** Representación 24h (HH:mm) en Bogotá, para mostrar en la UI/API. */
export function horaBogota24(fechaUtc: Date): string {
  return DateTime.fromJSDate(fechaUtc, { zone: "utc" })
    .setZone(ZONA_HORARIA)
    .toFormat("HH:mm");
}

/** ISO completo en Bogotá (útil para respuestas de API legibles). */
export function isoBogota(fechaUtc: Date): string {
  return DateTime.fromJSDate(fechaUtc, { zone: "utc" })
    .setZone(ZONA_HORARIA)
    .toISO({ suppressMilliseconds: true }) as string;
}

/** Día de la semana en Bogotá: 6 = sábado, 7 = domingo (ISO weekday de luxon). */
export function esFinDeSemanaBogota(fechaUtc: Date): boolean {
  const isoWeekday = DateTime.fromJSDate(fechaUtc, { zone: "utc" })
    .setZone(ZONA_HORARIA).weekday;
  return isoWeekday === 6 || isoWeekday === 7;
}

/** Igual que esFinDeSemanaBogota pero a partir de una fecha calendario "YYYY-MM-DD". */
export function esFinDeSemanaBogotaFecha(fechaYYYYMMDD: string): boolean {
  const isoWeekday = DateTime.fromFormat(fechaYYYYMMDD, "yyyy-MM-dd", { zone: ZONA_HORARIA }).weekday;
  return isoWeekday === 6 || isoWeekday === 7;
}

/** Horas transcurridas entre dos instantes, con dos decimales. */
export function horasEntre(inicio: Date, fin: Date): number {
  const diffMs = fin.getTime() - inicio.getTime();
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
}
