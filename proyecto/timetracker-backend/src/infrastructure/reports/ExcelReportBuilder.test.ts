import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { ExcelReportBuilder } from "./ExcelReportBuilder";
import { FilaReporteHoras, FilaReporteViaje } from "../repositories/ReportRepository";

const FILA_HORAS: FilaReporteHoras = {
  fecha: "2026-08-25",
  usuarioNombre: "Ana Pérez",
  horaInicio: new Date("2026-08-25T13:00:00Z"), // 08:00 Bogotá
  horaFin: new Date("2026-08-25T22:00:00Z"), // 17:00 Bogotá
  horasOrdinarias: 8,
  horasExtraDiurnas: 1,
  horasExtraNocturnas: 0,
  horasRecargoNocturno: 0,
  horasDominicalFestivo: 0,
  descripcionProyectos: "Proyecto Facturación",
};

const FILA_VIAJE: FilaReporteViaje = {
  fecha: "2026-08-25",
  usuarioNombre: "Ana Pérez",
  puntoPartida: "Oficina Bogotá",
  puntoFinal: "Cliente Zona Industrial",
  descripcion: "Visita técnica",
  valor: 5000,
};

async function leerWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return workbook;
}

describe("ExcelReportBuilder", () => {
  it("genera un .xlsx con las dos hojas exactas requeridas", async () => {
    const builder = new ExcelReportBuilder();
    const buffer = await builder.construir([FILA_HORAS], [FILA_VIAJE]);
    const workbook = await leerWorkbook(buffer);

    expect(workbook.worksheets.map((h) => h.name)).toEqual(["Horas laboradas", "Viajes laborados"]);
  });

  it("la hoja 'Horas laboradas' convierte las horas a Bogotá 24h y calcula el total del día", async () => {
    const builder = new ExcelReportBuilder();
    const buffer = await builder.construir([FILA_HORAS], []);
    const workbook = await leerWorkbook(buffer);
    const hoja = workbook.getWorksheet("Horas laboradas")!;

    const filaDatos = hoja.getRow(2).values as unknown[];
    expect(filaDatos[1]).toBe("Ana Pérez");
    expect(filaDatos[3]).toBe("08:00");
    expect(filaDatos[4]).toBe("17:00");
    expect(filaDatos[10]).toBe(9); // 8 ordinarias + 1 extra diurna
  });

  it("la hoja 'Horas laboradas' agrega una fila de totales al final", async () => {
    const builder = new ExcelReportBuilder();
    const buffer = await builder.construir(
      [FILA_HORAS, { ...FILA_HORAS, horasOrdinarias: 8, horasExtraDiurnas: 0 }],
      []
    );
    const workbook = await leerWorkbook(buffer);
    const hoja = workbook.getWorksheet("Horas laboradas")!;

    const filaTotal = hoja.getRow(4).values as unknown[]; // fila 1 header, 2-3 datos, 4 total
    expect(filaTotal[1]).toBe("TOTAL");
    expect(filaTotal[10]).toBe(17); // 9 + 8
  });

  it("la hoja 'Viajes laborados' incluye el valor y una fila de totales", async () => {
    const builder = new ExcelReportBuilder();
    const buffer = await builder.construir([], [FILA_VIAJE, { ...FILA_VIAJE, valor: 3000 }]);
    const workbook = await leerWorkbook(buffer);
    const hoja = workbook.getWorksheet("Viajes laborados")!;

    const filaTotal = hoja.getRow(4).values as unknown[];
    expect(filaTotal[1]).toBe("TOTAL");
    expect(filaTotal[6]).toBe(8000); // 5000 + 3000
  });

  it("cuando no hay filas, escribe un mensaje en vez de una fila de totales vacía", async () => {
    const builder = new ExcelReportBuilder();
    const buffer = await builder.construir([], []);
    const workbook = await leerWorkbook(buffer);

    const hojaHoras = workbook.getWorksheet("Horas laboradas")!;
    const hojaViajes = workbook.getWorksheet("Viajes laborados")!;
    expect((hojaHoras.getRow(2).values as unknown[])[1]).toContain("sin registros");
    expect((hojaViajes.getRow(2).values as unknown[])[1]).toContain("sin registros");
  });
});
