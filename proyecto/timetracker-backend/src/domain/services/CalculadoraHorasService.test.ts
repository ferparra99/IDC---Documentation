import { describe, it, expect } from "vitest";
import { CalculadoraHorasService } from "./CalculadoraHorasService";

const CONFIG_ESTANDAR = {
  inicioHorarioNocturno: "19:00",
  finHorarioNocturno: "06:00",
  horasOrdinariasPorDia: 8,
};

// Bogotá es UTC-5 todo el año (sin horario de verano), así que "13:00Z" = "08:00 Bogotá".
function bogota(hora: string, fecha = "2026-08-31"): Date {
  const [hh, mm] = hora.split(":").map(Number);
  const horaUtc = (hh + 5) % 24;
  const diaExtra = hh + 5 >= 24 ? 1 : 0;
  const fechaBase = new Date(`${fecha}T00:00:00Z`);
  fechaBase.setUTCDate(fechaBase.getUTCDate() + diaExtra);
  fechaBase.setUTCHours(horaUtc, mm, 0, 0);
  return fechaBase;
}

describe("CalculadoraHorasService", () => {
  const calc = new CalculadoraHorasService(CONFIG_ESTANDAR);

  it("una jornada de 8h exactas, toda diurna, queda 100% ordinaria", () => {
    const resultado = calc.calcular(bogota("08:00"), bogota("16:00"), false);
    expect(resultado).toEqual({
      horasOrdinarias: 8,
      horasExtraDiurnas: 0,
      horasExtraNocturnas: 0,
      horasRecargoNocturno: 0,
      horasDominicalFestivo: 0,
    });
  });

  it("una jornada de 9h diurnas separa 8 ordinarias + 1 extra diurna", () => {
    const resultado = calc.calcular(bogota("08:00"), bogota("17:00"), false);
    expect(resultado.horasOrdinarias).toBe(8);
    expect(resultado.horasExtraDiurnas).toBe(1);
    expect(resultado.horasExtraNocturnas).toBe(0);
    expect(resultado.horasRecargoNocturno).toBe(0);
  });

  it("una jornada que entra en la franja nocturna dentro de las 8h ordinarias genera recargo nocturno, no hora extra", () => {
    // 14:00 -> 22:00 = 8h ordinarias; de 19:00 a 22:00 (3h) caen en franja nocturna.
    const resultado = calc.calcular(bogota("14:00"), bogota("22:00"), false);
    expect(resultado.horasOrdinarias).toBe(5);
    expect(resultado.horasRecargoNocturno).toBe(3);
    expect(resultado.horasExtraDiurnas).toBe(0);
    expect(resultado.horasExtraNocturnas).toBe(0);
  });

  it("una jornada de 13h (8am-9pm) separa correctamente extra diurna y extra nocturna", () => {
    // 08:00->16:00 ordinarias (8h). 16:00->21:00 extra (5h): 16:00-19:00 extra diurna (3h),
    // 19:00-21:00 extra nocturna (2h).
    const resultado = calc.calcular(bogota("08:00"), bogota("21:00"), false);
    expect(resultado.horasOrdinarias).toBe(8);
    expect(resultado.horasExtraDiurnas).toBe(3);
    expect(resultado.horasExtraNocturnas).toBe(2);
    expect(resultado.horasRecargoNocturno).toBe(0);
  });

  it("una jornada íntegramente dentro de la franja nocturna, sin exceder 8h, es 100% recargo nocturno", () => {
    // 20:00 -> 04:00 (siguiente día) = 8h, toda dentro de la franja 19:00-06:00.
    const inicio = bogota("20:00");
    const fin = bogota("04:00", "2026-09-01");
    const resultado = calc.calcular(inicio, fin, false);
    expect(resultado.horasOrdinarias).toBe(0);
    expect(resultado.horasRecargoNocturno).toBe(8);
  });

  it("domingo/festivo: todas las horas van a horasDominicalFestivo, sin desglose adicional", () => {
    const resultado = calc.calcular(bogota("08:00"), bogota("17:00"), true);
    expect(resultado).toEqual({
      horasOrdinarias: 0,
      horasExtraDiurnas: 0,
      horasExtraNocturnas: 0,
      horasRecargoNocturno: 0,
      horasDominicalFestivo: 9,
    });
  });

  it("redondea a 2 decimales", () => {
    // 10 minutos = 0.1666...h -> debe redondear a 0.17
    const resultado = calc.calcular(bogota("08:00"), bogota("08:10"), false);
    expect(resultado.horasOrdinarias).toBe(0.17);
  });

  it("lanza error si la hora de fin no es posterior a la de inicio", () => {
    expect(() => calc.calcular(bogota("17:00"), bogota("08:00"), false)).toThrow(
      "La hora de fin debe ser posterior a la hora de inicio"
    );
  });

  it("lanza error si inicio y fin son iguales", () => {
    const misma = bogota("08:00");
    expect(() => calc.calcular(misma, misma, false)).toThrow();
  });

  it("respeta una franja nocturna configurada distinta a la estándar", () => {
    const calcPersonalizada = new CalculadoraHorasService({
      inicioHorarioNocturno: "21:00",
      finHorarioNocturno: "05:00",
      horasOrdinariasPorDia: 8,
    });
    // 14:00 -> 22:00 (8h ordinarias); con franja 21:00-05:00, solo 1h (21:00-22:00) es nocturna.
    const resultado = calcPersonalizada.calcular(bogota("14:00"), bogota("22:00"), false);
    expect(resultado.horasRecargoNocturno).toBe(1);
    expect(resultado.horasOrdinarias).toBe(7);
  });
});
