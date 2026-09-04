import { describe, it, expect } from "vitest";
import { ColombianHolidaysService } from "./ColombianHolidaysService";

const servicio = new ColombianHolidaysService();

/** Devuelve el día ISO de la semana (1=lunes..7=domingo) de una fecha "YYYY-MM-DD". */
function diaSemanaISO(fechaYYYYMMDD: string): number {
  const [anio, mes, dia] = fechaYYYYMMDD.split("-").map(Number);
  const dow = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

describe("ColombianHolidaysService", () => {
  it("calcula exactamente los 18 festivos oficiales de 2026 (verificado contra el calendario oficial)", () => {
    const festivos = servicio.calcularParaAnio(2026);
    expect(festivos).toEqual([
      { fecha: "2026-01-01", nombre: "Año Nuevo" },
      { fecha: "2026-01-12", nombre: "Reyes Magos" },
      { fecha: "2026-03-23", nombre: "San José" },
      { fecha: "2026-04-02", nombre: "Jueves Santo" },
      { fecha: "2026-04-03", nombre: "Viernes Santo" },
      { fecha: "2026-05-01", nombre: "Día del Trabajo" },
      { fecha: "2026-05-18", nombre: "Ascensión del Señor" },
      { fecha: "2026-06-08", nombre: "Corpus Christi" },
      { fecha: "2026-06-15", nombre: "Sagrado Corazón de Jesús" },
      { fecha: "2026-06-29", nombre: "San Pedro y San Pablo" },
      { fecha: "2026-07-20", nombre: "Independencia de Colombia" },
      { fecha: "2026-08-07", nombre: "Batalla de Boyacá" },
      { fecha: "2026-08-17", nombre: "Asunción de la Virgen" },
      { fecha: "2026-10-12", nombre: "Día de la Raza" },
      { fecha: "2026-11-02", nombre: "Todos los Santos" },
      { fecha: "2026-11-16", nombre: "Independencia de Cartagena" },
      { fecha: "2026-12-08", nombre: "Inmaculada Concepción" },
      { fecha: "2026-12-25", nombre: "Navidad" },
    ]);
  });

  it("calcula correctamente el domingo de Pascua vía el algoritmo de Meeus/Jones/Butcher (Jueves/Viernes Santo)", () => {
    // Pascua 2024 = 31 marzo; Pascua 2025 = 20 abril; Pascua 2027 = 28 marzo.
    expect(servicio.calcularParaAnio(2024)).toContainEqual({ fecha: "2024-03-28", nombre: "Jueves Santo" });
    expect(servicio.calcularParaAnio(2024)).toContainEqual({ fecha: "2024-03-29", nombre: "Viernes Santo" });
    expect(servicio.calcularParaAnio(2025)).toContainEqual({ fecha: "2025-04-17", nombre: "Jueves Santo" });
    expect(servicio.calcularParaAnio(2027)).toContainEqual({ fecha: "2027-03-25", nombre: "Jueves Santo" });
  });

  it("nunca traslada los festivos de fecha fija (no aplican Ley Emiliani)", () => {
    for (const anio of [2024, 2025, 2026, 2027]) {
      const festivos = servicio.calcularParaAnio(anio);
      expect(festivos).toContainEqual({ fecha: `${anio}-01-01`, nombre: "Año Nuevo" });
      expect(festivos).toContainEqual({ fecha: `${anio}-05-01`, nombre: "Día del Trabajo" });
      expect(festivos).toContainEqual({ fecha: `${anio}-07-20`, nombre: "Independencia de Colombia" });
      expect(festivos).toContainEqual({ fecha: `${anio}-08-07`, nombre: "Batalla de Boyacá" });
      expect(festivos).toContainEqual({ fecha: `${anio}-12-08`, nombre: "Inmaculada Concepción" });
      expect(festivos).toContainEqual({ fecha: `${anio}-12-25`, nombre: "Navidad" });
    }
  });

  it("cuando un festivo trasladable ya cae en lunes, no lo mueve (ej. Reyes Magos 2025)", () => {
    // 2025-01-06 es lunes.
    const festivos = servicio.calcularParaAnio(2025);
    expect(festivos).toContainEqual({ fecha: "2025-01-06", nombre: "Reyes Magos" });
  });

  it("todo festivo trasladable cae siempre en lunes, para cualquier año", () => {
    const NOMBRES_TRASLADABLES = new Set([
      "Reyes Magos",
      "San José",
      "Ascensión del Señor",
      "Corpus Christi",
      "Sagrado Corazón de Jesús",
      "San Pedro y San Pablo",
      "Asunción de la Virgen",
      "Día de la Raza",
      "Todos los Santos",
      "Independencia de Cartagena",
    ]);

    for (const anio of [2023, 2024, 2025, 2026, 2027, 2028, 2030]) {
      const festivos = servicio.calcularParaAnio(anio);
      for (const f of festivos) {
        if (NOMBRES_TRASLADABLES.has(f.nombre)) {
          expect(diaSemanaISO(f.fecha), `${f.nombre} ${f.fecha} (${anio}) debería caer en lunes`).toBe(1);
        }
      }
    }
  });

  it("siempre devuelve 18 festivos, ordenados cronológicamente", () => {
    for (const anio of [2023, 2024, 2025, 2026, 2027, 2028]) {
      const festivos = servicio.calcularParaAnio(anio);
      expect(festivos).toHaveLength(18);
      const fechas = festivos.map((f) => f.fecha);
      const fechasOrdenadas = [...fechas].sort();
      expect(fechas).toEqual(fechasOrdenadas);
    }
  });

  it("es determinístico: llamar dos veces con el mismo año da el mismo resultado", () => {
    expect(servicio.calcularParaAnio(2026)).toEqual(servicio.calcularParaAnio(2026));
  });
});
