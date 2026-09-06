package com.idc.timetracker.modules.report;

import com.idc.timetracker.modules.attendance.RegistroJornada;
import com.idc.timetracker.modules.trip.Viaje;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class ExcelReportBuilder {

    private static final String HEADER_COLOR = "FFDBEAFE";
    private static final DateTimeFormatter DF = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public byte[] build(List<RegistroJornada> jornadas, List<Viaje> viajes) {
        try (Workbook wb = new XSSFWorkbook()) {
            buildHorasSheet(wb, jornadas);
            buildViajesSheet(wb, viajes);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generando Excel", e);
        }
    }

    private void buildHorasSheet(Workbook wb, List<RegistroJornada> jornadas) {
        Sheet sheet = wb.createSheet("Horas laboradas");
        String[] headers = {"Fecha", "Usuario", "Estado", "Hora Inicio (Bogota)", "Hora Fin (Bogota)", "Ordinarias", "Extra Diurnas", "Extra Nocturnas", "Recargo Nocturno", "Dominical/Festivo", "Total"};
        CellStyle headerStyle = headerStyle(wb);
        CellStyle dateStyle = dateStyle(wb);
        Row header = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell c = header.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }
        int rowIdx = 1;
        BigDecimal totOrd = BigDecimal.ZERO, totExtraD = BigDecimal.ZERO, totExtraN = BigDecimal.ZERO, totRec = BigDecimal.ZERO, totDom = BigDecimal.ZERO;
        for (RegistroJornada r : jornadas) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(r.getFecha() != null ? r.getFecha().format(DF) : "");
            row.createCell(1).setCellValue(r.getUsuario() != null ? r.getUsuario().getEmail() : "");
            row.createCell(2).setCellValue(r.getEstado() != null ? r.getEstado().name() : "");
            row.createCell(3).setCellValue(r.getHoraInicio() != null ? r.getHoraInicio().toString() : "");
            row.createCell(4).setCellValue(r.getHoraFin() != null ? r.getHoraFin().toString() : "");
            row.createCell(5).setCellValue(val(r.getHorasOrdinarias()));
            row.createCell(6).setCellValue(val(r.getHorasExtraDiurnas()));
            row.createCell(7).setCellValue(val(r.getHorasExtraNocturnas()));
            row.createCell(8).setCellValue(val(r.getHorasRecargoNocturno()));
            row.createCell(9).setCellValue(val(r.getHorasDominicalFestivo()));
            double total = val(r.getHorasOrdinarias()) + val(r.getHorasExtraDiurnas()) + val(r.getHorasExtraNocturnas()) + val(r.getHorasRecargoNocturno()) + val(r.getHorasDominicalFestivo());
            row.createCell(10).setCellValue(total);
            totOrd = totOrd.add(nz(r.getHorasOrdinarias()));
            totExtraD = totExtraD.add(nz(r.getHorasExtraDiurnas()));
            totExtraN = totExtraN.add(nz(r.getHorasExtraNocturnas()));
            totRec = totRec.add(nz(r.getHorasRecargoNocturno()));
            totDom = totDom.add(nz(r.getHorasDominicalFestivo()));
        }
        Row totalRow = sheet.createRow(rowIdx);
        totalRow.createCell(0).setCellValue("TOTAL");
        totalRow.getCell(0).setCellStyle(headerStyle);
        totalRow.createCell(5).setCellValue(totOrd.doubleValue());
        totalRow.createCell(6).setCellValue(totExtraD.doubleValue());
        totalRow.createCell(7).setCellValue(totExtraN.doubleValue());
        totalRow.createCell(8).setCellValue(totRec.doubleValue());
        totalRow.createCell(9).setCellValue(totDom.doubleValue());
        totalRow.createCell(10).setCellValue(totOrd.add(totExtraD).add(totExtraN).add(totRec).add(totDom).doubleValue());
        sheet.createFreezePane(0, 1);
        sheet.setAutoFilter(new CellRangeAddress(0, 0, 0, headers.length - 1));
        for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
    }

    private void buildViajesSheet(Workbook wb, List<Viaje> viajes) {
        Sheet sheet = wb.createSheet("Viajes laborados");
        String[] headers = {"Fecha", "Usuario", "Punto Partida", "Punto Final", "Descripcion", "Valor"};
        CellStyle headerStyle = headerStyle(wb);
        Row header = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell c = header.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }
        int rowIdx = 1;
        BigDecimal total = BigDecimal.ZERO;
        for (Viaje v : viajes) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(v.getFecha() != null ? v.getFecha().format(DF) : "");
            row.createCell(1).setCellValue(v.getUsuario() != null ? v.getUsuario().getEmail() : "");
            row.createCell(2).setCellValue(v.getPuntoPartida() != null ? v.getPuntoPartida() : "");
            row.createCell(3).setCellValue(v.getPuntoFinal() != null ? v.getPuntoFinal() : "");
            row.createCell(4).setCellValue(v.getDescripcion() != null ? v.getDescripcion() : "");
            row.createCell(5).setCellValue(v.getValor() != null ? v.getValor().doubleValue() : 0);
            if (v.getValor() != null) total = total.add(v.getValor());
        }
        Row totalRow = sheet.createRow(rowIdx);
        totalRow.createCell(0).setCellValue("TOTAL");
        totalRow.getCell(0).setCellStyle(headerStyle);
        totalRow.createCell(5).setCellValue(total.doubleValue());
        sheet.createFreezePane(0, 1);
        sheet.setAutoFilter(new CellRangeAddress(0, 0, 0, headers.length - 1));
        for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
    }

    private CellStyle headerStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        s.setFillForegroundColor(IndexedColors.AUTOMATIC.getIndex());
        // FFDBEAFE approximation with light blue
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        try {
            org.apache.poi.xssf.usermodel.XSSFCellStyle xs = (org.apache.poi.xssf.usermodel.XSSFCellStyle) s;
            xs.setFillForegroundColor(new org.apache.poi.xssf.usermodel.XSSFColor(hexToBytes(HEADER_COLOR), null));
        } catch (Exception ignored) {}
        Font f = wb.createFont();
        f.setBold(true);
        f.setColor(IndexedColors.WHITE.getIndex());
        s.setFont(f);
        s.setAlignment(HorizontalAlignment.CENTER);
        s.setBorderBottom(BorderStyle.THIN);
        s.setBorderTop(BorderStyle.THIN);
        s.setBorderLeft(BorderStyle.THIN);
        s.setBorderRight(BorderStyle.THIN);
        return s;
    }

    private CellStyle dateStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        CreationHelper ch = wb.getCreationHelper();
        s.setDataFormat(ch.createDataFormat().getFormat("yyyy-mm-dd"));
        return s;
    }

    private double val(BigDecimal bd) { return bd != null ? bd.doubleValue() : 0; }
    private BigDecimal nz(BigDecimal bd) { return bd != null ? bd : BigDecimal.ZERO; }
    private byte[] hexToBytes(String hex) {
        String clean = hex.startsWith("FF") ? hex.substring(2) : hex;
        int len = clean.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) data[i/2] = (byte) ((Character.digit(clean.charAt(i),16)<<4)+Character.digit(clean.charAt(i+1),16));
        return data;
    }
}
