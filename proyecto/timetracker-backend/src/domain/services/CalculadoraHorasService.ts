import { DateTime, Interval } from "luxon";
import { ZONA_HORARIA } from "../../shared/config/env";
import { ConfiguracionVigente } from "./ConfiguracionVigente";

export interface DesgloseHoras {
  horasOrdinarias: number;
  horasExtraDiurnas: number;
  horasExtraNocturnas: number;
  horasRecargoNocturno: number;
  horasDominicalFestivo: number;
}

/**
 * Calcula el desglose de horas de UNA jornada (un par horaInicio/horaFin) según:
 *  - jornada nocturna configurable (docs/REQUIREMENTS.md sección 4),
 *  - umbral de horas ordinarias por día (por defecto 8h),
 *  - si el día de inicio es domingo/festivo.
 *
 * Simplificación documentada (Fase 1): si el día es dominical/festivo, TODAS las
 * horas trabajadas se registran en `horasDominicalFestivo` (sin distinguir a su vez
 * si además son nocturnas o "extra"). El Código Sustantivo del Trabajo contempla
 * combinaciones más finas (ej. hora extra dominical-nocturna al 155%) — afinar esta
 * regla es un pendiente explícito para cuando se implemente nómina/liquidación,
 * no bloquea el fichaje de Fase 1. Ver docs/REQUIREMENTS.md sección 3.
 */
export class CalculadoraHorasService {
  constructor(private readonly config: ConfiguracionVigente) {}

  calcular(horaInicioUtc: Date, horaFinUtc: Date, esDominicalOFestivo: boolean): DesgloseHoras {
    const inicio = DateTime.fromJSDate(horaInicioUtc, { zone: "utc" }).setZone(ZONA_HORARIA);
    const fin = DateTime.fromJSDate(horaFinUtc, { zone: "utc" }).setZone(ZONA_HORARIA);

    if (fin <= inicio) {
      throw new Error("La hora de fin debe ser posterior a la hora de inicio");
    }

    const totalHoras = fin.diff(inicio, "hours").hours;

    if (esDominicalOFestivo) {
      return {
        horasOrdinarias: 0,
        horasExtraDiurnas: 0,
        horasExtraNocturnas: 0,
        horasRecargoNocturno: 0,
        horasDominicalFestivo: this.redondear(totalHoras),
      };
    }

    const horasOrdinariasPorDia = this.config.horasOrdinariasPorDia;
    const finJornadaOrdinaria = totalHoras > horasOrdinariasPorDia
      ? inicio.plus({ hours: horasOrdinariasPorDia })
      : fin;

    const segmentoOrdinario = Interval.fromDateTimes(inicio, finJornadaOrdinaria);
    const segmentoExtra = Interval.fromDateTimes(finJornadaOrdinaria, fin);

    const nocturnoEnOrdinario = this.horasNocturnasEnIntervalo(segmentoOrdinario);
    const nocturnoEnExtra = this.horasNocturnasEnIntervalo(segmentoExtra);

    const horasOrdinarias = segmentoOrdinario.length("hours") - nocturnoEnOrdinario;
    const horasExtraDiurnas = segmentoExtra.length("hours") - nocturnoEnExtra;

    return {
      horasOrdinarias: this.redondear(horasOrdinarias),
      horasExtraDiurnas: this.redondear(horasExtraDiurnas),
      horasExtraNocturnas: this.redondear(nocturnoEnExtra),
      horasRecargoNocturno: this.redondear(nocturnoEnOrdinario),
      horasDominicalFestivo: 0,
    };
  }

  /** Suma las horas de `intervalo` que caen dentro de alguna franja nocturna configurada. */
  private horasNocturnasEnIntervalo(intervalo: Interval): number {
    if (intervalo.length("hours") <= 0) return 0;

    const [horaInicioNoc, minInicioNoc] = this.config.inicioHorarioNocturno.split(":").map(Number);
    const [horaFinNoc, minFinNoc] = this.config.finHorarioNocturno.split(":").map(Number);

    let totalNocturno = 0;
    // Recorremos cada día tocado por el intervalo (y el día anterior, porque la
    // franja nocturna de "ayer" puede extenderse hasta la madrugada de "hoy").
    let cursor = intervalo.start!.minus({ days: 1 }).startOf("day");
    const limite = intervalo.end!.startOf("day");

    while (cursor <= limite) {
      const inicioFranja = cursor.set({ hour: horaInicioNoc, minute: minInicioNoc, second: 0, millisecond: 0 });
      const finFranja = cursor.plus({ days: 1 }).set({ hour: horaFinNoc, minute: minFinNoc, second: 0, millisecond: 0 });
      const franjaNocturna = Interval.fromDateTimes(inicioFranja, finFranja);

      const overlap = intervalo.intersection(franjaNocturna);
      if (overlap) {
        totalNocturno += overlap.length("hours");
      }
      cursor = cursor.plus({ days: 1 });
    }

    return totalNocturno;
  }

  private redondear(horas: number): number {
    return Math.round(horas * 100) / 100;
  }
}
