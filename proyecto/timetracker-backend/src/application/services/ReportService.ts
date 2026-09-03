import { ReportRepository } from "../../infrastructure/repositories/ReportRepository";
import { ExcelReportBuilder } from "../../infrastructure/reports/ExcelReportBuilder";
import { logger } from "../../shared/logger/logger";

export class ReportService {
  constructor(
    private readonly repo: ReportRepository,
    private readonly builder: ExcelReportBuilder = new ExcelReportBuilder()
  ) {}

  async generarExcel(desde: string, hasta: string, usuarioId?: string): Promise<Buffer> {
    const [horas, viajes] = await Promise.all([
      this.repo.horasParaReporte(desde, hasta, usuarioId),
      this.repo.viajesParaReporte(desde, hasta, usuarioId),
    ]);

    const buffer = await this.builder.construir(horas, viajes);
    logger.info(
      { desde, hasta, usuarioId: usuarioId ?? "TODOS", filasHoras: horas.length, filasViajes: viajes.length },
      "Reporte Excel generado"
    );
    return buffer;
  }
}
