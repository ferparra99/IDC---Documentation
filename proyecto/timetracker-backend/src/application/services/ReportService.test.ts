import { describe, it, expect, vi, type Mock } from "vitest";
import { ReportService } from "./ReportService";
import { ReportRepository } from "../../infrastructure/repositories/ReportRepository";
import { ExcelReportBuilder } from "../../infrastructure/reports/ExcelReportBuilder";

function crearDependencias() {
  const repo = {
    horasParaReporte: vi.fn(),
    viajesParaReporte: vi.fn(),
  } as unknown as ReportRepository;

  const builder = { construir: vi.fn() } as unknown as ExcelReportBuilder;

  return { repo, builder };
}

describe("ReportService", () => {
  it("consulta horas y viajes en paralelo y delega la construcción del Excel al builder", async () => {
    const { repo, builder } = crearDependencias();
    const filasHoras = [{ fecha: "2026-08-10" }];
    const filasViajes = [{ fecha: "2026-08-10" }];
    (repo.horasParaReporte as Mock).mockResolvedValue(filasHoras);
    (repo.viajesParaReporte as Mock).mockResolvedValue(filasViajes);
    const bufferEsperado = Buffer.from("contenido-xlsx-simulado");
    (builder.construir as Mock).mockResolvedValue(bufferEsperado);

    const service = new ReportService(repo, builder);
    const resultado = await service.generarExcel("2026-08-01", "2026-08-31", "usuario-1");

    expect(repo.horasParaReporte).toHaveBeenCalledWith("2026-08-01", "2026-08-31", "usuario-1");
    expect(repo.viajesParaReporte).toHaveBeenCalledWith("2026-08-01", "2026-08-31", "usuario-1");
    expect(builder.construir).toHaveBeenCalledWith(filasHoras, filasViajes);
    expect(resultado).toBe(bufferEsperado);
  });

  it("permite usuarioId undefined (reporte consolidado de administrador)", async () => {
    const { repo, builder } = crearDependencias();
    (repo.horasParaReporte as Mock).mockResolvedValue([]);
    (repo.viajesParaReporte as Mock).mockResolvedValue([]);
    (builder.construir as Mock).mockResolvedValue(Buffer.from(""));

    const service = new ReportService(repo, builder);
    await service.generarExcel("2026-08-01", "2026-08-31");

    expect(repo.horasParaReporte).toHaveBeenCalledWith("2026-08-01", "2026-08-31", undefined);
  });
});
