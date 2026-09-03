import ExcelJS from "exceljs";
import { FilaReporteHoras, FilaReporteViaje } from "../repositories/ReportRepository";
import { horaBogota24 } from "../../shared/utils/tiempo";

const COLOR_ENCABEZADO = "FFDBEAFE";

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Adaptador de infraestructura: sabe cómo volcar datos ya calculados a un
 * archivo `.xlsx` (docs/REQUIREMENTS.md sección 6). No conoce reglas de
 * negocio ni toca la base de datos — solo formatea (Single Responsibility).
 */
export class ExcelReportBuilder {
  async construir(horas: FilaReporteHoras[], viajes: FilaReporteViaje[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema de Control de Jornada Laboral";
    workbook.created = new Date();

    this.construirHojaHoras(workbook, horas);
    this.construirHojaViajes(workbook, viajes);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private construirHojaHoras(workbook: ExcelJS.Workbook, filas: FilaReporteHoras[]): void {
    const hoja = workbook.addWorksheet("Horas laboradas", { views: [{ state: "frozen", ySplit: 1 }] });

    hoja.columns = [
      { header: "Empleado", key: "empleado", width: 28 },
      { header: "Fecha", key: "fecha", width: 12 },
      { header: "Hora inicio", key: "horaInicio", width: 12 },
      { header: "Hora fin", key: "horaFin", width: 12 },
      { header: "Ordinarias", key: "ordinarias", width: 12 },
      { header: "Extra diurnas", key: "extraDiurnas", width: 14 },
      { header: "Extra nocturnas", key: "extraNocturnas", width: 15 },
      { header: "Recargo nocturno", key: "recargoNocturno", width: 16 },
      { header: "Dominical/Festivo", key: "dominicalFestivo", width: 17 },
      { header: "Total día (h)", key: "total", width: 13 },
      { header: "Proyectos trabajados", key: "proyectos", width: 45 },
    ];
    this.estilizarEncabezado(hoja);

    const totales = { ordinarias: 0, extraDiurnas: 0, extraNocturnas: 0, recargoNocturno: 0, dominicalFestivo: 0 };

    for (const f of filas) {
      const total =
        f.horasOrdinarias + f.horasExtraDiurnas + f.horasExtraNocturnas + f.horasRecargoNocturno + f.horasDominicalFestivo;

      hoja.addRow({
        empleado: f.usuarioNombre,
        fecha: f.fecha,
        horaInicio: f.horaInicio ? horaBogota24(f.horaInicio) : "",
        horaFin: f.horaFin ? horaBogota24(f.horaFin) : "",
        ordinarias: f.horasOrdinarias,
        extraDiurnas: f.horasExtraDiurnas,
        extraNocturnas: f.horasExtraNocturnas,
        recargoNocturno: f.horasRecargoNocturno,
        dominicalFestivo: f.horasDominicalFestivo,
        total: redondear(total),
        proyectos: f.descripcionProyectos ?? "",
      });

      totales.ordinarias += f.horasOrdinarias;
      totales.extraDiurnas += f.horasExtraDiurnas;
      totales.extraNocturnas += f.horasExtraNocturnas;
      totales.recargoNocturno += f.horasRecargoNocturno;
      totales.dominicalFestivo += f.horasDominicalFestivo;
    }

    if (filas.length === 0) {
      hoja.addRow({ empleado: "(sin registros en el rango seleccionado)" });
    } else {
      const totalGeneral =
        totales.ordinarias + totales.extraDiurnas + totales.extraNocturnas + totales.recargoNocturno + totales.dominicalFestivo;
      const filaTotal = hoja.addRow({
        empleado: "TOTAL",
        ordinarias: redondear(totales.ordinarias),
        extraDiurnas: redondear(totales.extraDiurnas),
        extraNocturnas: redondear(totales.extraNocturnas),
        recargoNocturno: redondear(totales.recargoNocturno),
        dominicalFestivo: redondear(totales.dominicalFestivo),
        total: redondear(totalGeneral),
      });
      filaTotal.font = { bold: true };
      filaTotal.eachCell((cell) => {
        cell.border = { top: { style: "thin" } };
      });
    }

    hoja.autoFilter = { from: "A1", to: "K1" };
  }

  private construirHojaViajes(workbook: ExcelJS.Workbook, filas: FilaReporteViaje[]): void {
    const hoja = workbook.addWorksheet("Viajes laborados", { views: [{ state: "frozen", ySplit: 1 }] });

    hoja.columns = [
      { header: "Empleado", key: "empleado", width: 28 },
      { header: "Fecha", key: "fecha", width: 12 },
      { header: "Punto de partida", key: "puntoPartida", width: 30 },
      { header: "Punto final", key: "puntoFinal", width: 30 },
      { header: "Motivo del viaje", key: "descripcion", width: 40 },
      { header: "Valor (COP)", key: "valor", width: 14 },
    ];
    this.estilizarEncabezado(hoja);

    let totalValor = 0;
    for (const f of filas) {
      hoja.addRow({
        empleado: f.usuarioNombre,
        fecha: f.fecha,
        puntoPartida: f.puntoPartida,
        puntoFinal: f.puntoFinal,
        descripcion: f.descripcion,
        valor: f.valor,
      });
      totalValor += f.valor;
    }
    hoja.getColumn("valor").numFmt = '"$"#,##0';

    if (filas.length === 0) {
      hoja.addRow({ empleado: "(sin registros en el rango seleccionado)" });
    } else {
      const filaTotal = hoja.addRow({ empleado: "TOTAL", valor: redondear(totalValor) });
      filaTotal.font = { bold: true };
      filaTotal.eachCell((cell) => {
        cell.border = { top: { style: "thin" } };
      });
    }

    hoja.autoFilter = { from: "A1", to: "F1" };
  }

  private estilizarEncabezado(hoja: ExcelJS.Worksheet): void {
    const fila = hoja.getRow(1);
    fila.font = { bold: true };
    fila.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ENCABEZADO } };
      cell.border = { bottom: { style: "thin" } };
    });
  }
}
