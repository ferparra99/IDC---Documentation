export function primerYUltimoDiaSemana(fechaYYYYMMDD: string): { lunes: string; domingo: string } {
  const [y, m, d] = fechaYYYYMMDD.split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  const diaSemanaISO = (fecha.getUTCDay() + 6) % 7; // 0 = lunes
  const lunes = new Date(fecha);
  lunes.setUTCDate(fecha.getUTCDate() - diaSemanaISO);
  const domingo = new Date(lunes);
  domingo.setUTCDate(lunes.getUTCDate() + 6);
  return { lunes: aYYYYMMDD(lunes), domingo: aYYYYMMDD(domingo) };
}

export function hoyYYYYMMDD(): string {
  return aYYYYMMDD(new Date());
}

function aYYYYMMDD(fecha: Date): string {
  return `${fecha.getUTCFullYear().toString().padStart(4, "0")}-${(fecha.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${fecha.getUTCDate().toString().padStart(2, "0")}`;
}

export function hhmmAMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutosAIsoBogota(fechaYYYYMMDD: string, minutos: number): string {
  const h = Math.floor(minutos / 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(minutos % 60)
    .toString()
    .padStart(2, "0");
  // Colombia no tiene horario de verano: el offset -05:00 es constante todo el año.
  return `${fechaYYYYMMDD}T${h}:${m}:00-05:00`;
}
