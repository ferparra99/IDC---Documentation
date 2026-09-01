/**
 * Calcula los festivos colombianos de un año calendario mediante las reglas
 * oficiales (Ley 51 de 1983 "Ley Emiliani" + festivos religiosos basados en
 * la fecha de Pascua), en vez de depender de una librería externa cuyo
 * mantenimiento no controlamos. Es determinístico y queda cacheado en la
 * tabla `festivos` (ver `FestivoRepository`) para no recalcular en cada
 * request y para que el resultado sea auditable.
 *
 * Referencia de reglas:
 *  - Festivos que NO se trasladan (fecha fija siempre): 1 ene, 1 may, 20 jul,
 *    7 ago, 8 dic, 25 dic.
 *  - Festivos que SÍ se trasladan al siguiente lunes si no caen en lunes
 *    (Ley Emiliani): 6 ene, 19 mar, 29 jun, 15 ago, 12 oct, 1 nov, 11 nov,
 *    y los religiosos móviles Ascensión, Corpus Christi y Sagrado Corazón.
 *  - Jueves y Viernes Santo: fecha fija respecto a Pascua, nunca se trasladan.
 */
export interface FestivoCalculado {
  fecha: string; // YYYY-MM-DD
  nombre: string;
}

export class ColombianHolidaysService {
  calcularParaAnio(anio: number): FestivoCalculado[] {
    const pascua = this.calcularDomingoPascua(anio);

    const fijos: FestivoCalculado[] = [
      { fecha: this.aYYYYMMDD(anio, 1, 1), nombre: "Año Nuevo" },
      { fecha: this.aYYYYMMDD(anio, 5, 1), nombre: "Día del Trabajo" },
      { fecha: this.aYYYYMMDD(anio, 7, 20), nombre: "Independencia de Colombia" },
      { fecha: this.aYYYYMMDD(anio, 8, 7), nombre: "Batalla de Boyacá" },
      { fecha: this.aYYYYMMDD(anio, 12, 8), nombre: "Inmaculada Concepción" },
      { fecha: this.aYYYYMMDD(anio, 12, 25), nombre: "Navidad" },
    ];

    const trasladablesFijos: FestivoCalculado[] = [
      { fecha: this.aYYYYMMDD(anio, 1, 6), nombre: "Reyes Magos" },
      { fecha: this.aYYYYMMDD(anio, 3, 19), nombre: "San José" },
      { fecha: this.aYYYYMMDD(anio, 6, 29), nombre: "San Pedro y San Pablo" },
      { fecha: this.aYYYYMMDD(anio, 8, 15), nombre: "Asunción de la Virgen" },
      { fecha: this.aYYYYMMDD(anio, 10, 12), nombre: "Día de la Raza" },
      { fecha: this.aYYYYMMDD(anio, 11, 1), nombre: "Todos los Santos" },
      { fecha: this.aYYYYMMDD(anio, 11, 11), nombre: "Independencia de Cartagena" },
    ].map((f) => ({ fecha: this.trasladarASiguienteLunes(f.fecha), nombre: f.nombre }));

    const religiosos: FestivoCalculado[] = [
      { fecha: this.sumarDias(pascua, -3), nombre: "Jueves Santo" },
      { fecha: this.sumarDias(pascua, -2), nombre: "Viernes Santo" },
    ];

    const religiososMoviles: FestivoCalculado[] = [
      { fecha: this.sumarDias(pascua, 43), nombre: "Ascensión del Señor" },
      { fecha: this.sumarDias(pascua, 64), nombre: "Corpus Christi" },
      { fecha: this.sumarDias(pascua, 71), nombre: "Sagrado Corazón de Jesús" },
    ].map((f) => ({ fecha: this.trasladarASiguienteLunes(f.fecha), nombre: f.nombre }));

    return [...fijos, ...trasladablesFijos, ...religiosos, ...religiososMoviles].sort((a, b) =>
      a.fecha.localeCompare(b.fecha)
    );
  }

  /** Algoritmo de Meeus/Jones/Butcher para calcular el domingo de Pascua (calendario gregoriano). */
  private calcularDomingoPascua(anio: number): string {
    const a = anio % 19;
    const b = Math.floor(anio / 100);
    const c = anio % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return this.aYYYYMMDD(anio, mes, dia);
  }

  private trasladarASiguienteLunes(fechaYYYYMMDD: string): string {
    const diaSemana = this.diaDeLaSemanaISO(fechaYYYYMMDD); // 1 = lunes ... 7 = domingo
    if (diaSemana === 1) return fechaYYYYMMDD;
    const diasHastaLunes = 8 - diaSemana; // ej: martes(2) -> 6 días
    return this.sumarDias(fechaYYYYMMDD, diasHastaLunes);
  }

  private diaDeLaSemanaISO(fechaYYYYMMDD: string): number {
    const [anio, mes, dia] = fechaYYYYMMDD.split("-").map(Number);
    // Date.UTC evita corrimientos por zona horaria del proceso.
    const dow = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(); // 0 = domingo
    return dow === 0 ? 7 : dow;
  }

  private sumarDias(fechaYYYYMMDD: string, dias: number): string {
    const [anio, mes, dia] = fechaYYYYMMDD.split("-").map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    fecha.setUTCDate(fecha.getUTCDate() + dias);
    return this.aYYYYMMDD(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, fecha.getUTCDate());
  }

  private aYYYYMMDD(anio: number, mes: number, dia: number): string {
    return `${anio.toString().padStart(4, "0")}-${mes.toString().padStart(2, "0")}-${dia
      .toString()
      .padStart(2, "0")}`;
  }
}
