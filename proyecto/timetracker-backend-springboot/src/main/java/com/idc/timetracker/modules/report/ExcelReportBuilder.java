package com.idc.timetracker.modules.report;

import com.idc.timetracker.modules.attendance.RegistroJornada;
import com.idc.timetracker.modules.attendance.SegmentoExtra;
import com.idc.timetracker.modules.leave.Permiso;
import com.idc.timetracker.modules.trip.Viaje;
import com.idc.timetracker.modules.user.Usuario;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Component
public class ExcelReportBuilder {

    private static final String HEADER_COLOR = "FFDBEAFE";
    private static final DateTimeFormatter DF_DIA = DateTimeFormatter.ofPattern("d/M/yyyy");
    private static final DateTimeFormatter DF_FECHA_REPORTE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TF_HORA = DateTimeFormatter.ofPattern("h:mm a", Locale.forLanguageTag("es-CO"));
    private static final ZoneId ZONA_BOGOTA = ZoneId.of("America/Bogota");

    private Workbook loadTemplateWorkbook() {
        try {
            InputStream is = getClass().getResourceAsStream("/template/BASE_REPORT.xlsx");
            if (is != null) {
                return new XSSFWorkbook(is);
            }
        } catch (Exception e) {
            // fallback
        }
        try {
            // fallback absolute path (dev)
            java.nio.file.Path p = Paths.get("H:/dev/IDC/IDC---Documentation/proyecto/BASE_REPORT.xlsx");
            if (Files.exists(p)) {
                try (InputStream is2 = Files.newInputStream(p)) {
                    return new XSSFWorkbook(is2);
                }
            }
            // try relative
            java.nio.file.Path p2 = Paths.get("src/main/resources/template/BASE_REPORT.xlsx");
            if (Files.exists(p2)) {
                try (InputStream is3 = Files.newInputStream(p2)) {
                    return new XSSFWorkbook(is3);
                }
            }
        } catch (Exception e) {
            // ignore
        }
        // last resort: create empty workbook (for tests without template)
        return new XSSFWorkbook();
    }

    // compatibilidad: tests antiguos llaman build(jornadas, viajes) -> usa lógica antigua por horas fields
    public byte[] build(List<RegistroJornada> jornadas, List<Viaje> viajes) {
        return build("Usuario", LocalDate.now(ZONA_BOGOTA), jornadas, viajes, Map.of(), Map.of());
    }

    // flujo antiguo sin segmentos (para tests)
    public byte[] build(String nombre, LocalDate fechaReporte, List<RegistroJornada> jornadas, List<Viaje> viajes,
                        Map<LocalDate, Permiso> permisosPorFecha, Map<UUID, String> observacionesByRegistroId) {
        try (Workbook wb = loadTemplateWorkbook()) {
            // if template loaded has sheets, use first as horas
            if (wb.getNumberOfSheets() == 0) {
                // fallback create
                addHorasSheetFallback(wb, nombre, fechaReporte, jornadas, permisosPorFecha, observacionesByRegistroId);
            } else {
                Sheet sheet = wb.getSheetAt(0);
                // rename first sheet
                try { wb.setSheetName(0, "HORAS EXTRA Y PERMISOS"); } catch (Exception ignored) {}
                populateHorasSheetFromTemplate(sheet, wb, nombre, fechaReporte, jornadas, null, permisosPorFecha, observacionesByRegistroId);
                // remove extra template sheets if any? keep
            }
            // viajes hoja aparte
            addViajesSheet(wb, nombre, fechaReporte, viajes);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generando Excel", e);
        }
    }

    // nuevo flujo con segmentos extra
    public byte[] buildWithSegmentos(String nombre, LocalDate fechaReporte, List<RegistroJornada> jornadas, List<Viaje> viajes,
                                     Map<LocalDate, Permiso> permisosPorFecha, Map<UUID, String> observacionesByRegistroId,
                                     Map<UUID, List<SegmentoExtra>> segmentosByRegistroId) {
        try (Workbook wb = loadTemplateWorkbook()) {
            if (wb.getNumberOfSheets() == 0) {
                addHorasSheetWithSegmentosFallback(wb, nombre, fechaReporte, jornadas, permisosPorFecha, observacionesByRegistroId, segmentosByRegistroId);
            } else {
                Sheet sheet = wb.getSheetAt(0);
                try { wb.setSheetName(0, "HORAS EXTRA Y PERMISOS"); } catch (Exception ignored) {}
                populateHorasSheetFromTemplate(sheet, wb, nombre, fechaReporte, jornadas, segmentosByRegistroId, permisosPorFecha, observacionesByRegistroId);
            }
            addViajesSheet(wb, nombre, fechaReporte, viajes);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generando Excel con segmentos", e);
        }
    }

    public byte[] buildMulti(Map<Usuario, List<RegistroJornada>> jornadasPorUsuario,
                             Map<Usuario, List<Viaje>> viajesPorUsuario,
                             Map<Usuario, Map<LocalDate, Permiso>> permisosPorUsuario,
                             Map<UUID, String> observacionesByRegistroId,
                             LocalDate fechaReporte) {
        // legacy multi sin segmentos (fallback)
        return buildMultiWithSegmentos(jornadasPorUsuario, viajesPorUsuario, permisosPorUsuario, observacionesByRegistroId, Map.of(), fechaReporte);
    }

    public byte[] buildMultiWithSegmentos(Map<Usuario, List<RegistroJornada>> jornadasPorUsuario,
                                          Map<Usuario, List<Viaje>> viajesPorUsuario,
                                          Map<Usuario, Map<LocalDate, Permiso>> permisosPorUsuario,
                                          Map<UUID, String> observacionesByRegistroId,
                                          Map<UUID, List<SegmentoExtra>> segmentosByRegistroId,
                                          LocalDate fechaReporte) {
        try (Workbook wb = loadTemplateWorkbook()) {
            boolean hasTemplate = wb.getNumberOfSheets() > 0;
            Sheet templateSheet = hasTemplate ? wb.getSheetAt(0) : null;

            if (jornadasPorUsuario.isEmpty() && viajesPorUsuario.isEmpty()) {
                if (hasTemplate) {
                    populateHorasSheetFromTemplate(templateSheet, wb, "Usuario", fechaReporte, List.of(), Map.of(), Map.of(), Map.of());
                    addViajesSheet(wb, "Usuario", fechaReporte, List.of());
                } else {
                    addHorasSheetWithSegmentosFallback(wb, "Usuario", fechaReporte, List.of(), Map.of(), Map.of(), Map.of());
                    addViajesSheet(wb, "Usuario", fechaReporte, List.of());
                }
            } else {
                java.util.Set<Usuario> usuarios = new java.util.LinkedHashSet<>();
                usuarios.addAll(jornadasPorUsuario.keySet());
                usuarios.addAll(viajesPorUsuario.keySet());
                // Para no contaminar la plantilla, siempre clonar y luego eliminar el original
                for (Usuario u : usuarios) {
                    String nombre = u.getNombre() != null ? u.getNombre() : u.getEmail();
                    List<RegistroJornada> js = jornadasPorUsuario.getOrDefault(u, List.of());
                    List<Viaje> vs = viajesPorUsuario.getOrDefault(u, List.of());
                    Map<LocalDate, Permiso> perms = permisosPorUsuario.getOrDefault(u, Map.of());

                    if (hasTemplate) {
                        Sheet sheet = wb.cloneSheet(0);
                        int idx = wb.getNumberOfSheets() - 1;
                        try {
                            wb.setSheetName(idx, sanitizeSheetName("HORAS - " + nombre));
                        } catch (Exception e) {
                            String base = sanitizeSheetName("HORAS - " + nombre);
                            int dup = 1;
                            while (true) {
                                try { wb.setSheetName(idx, base + " (" + dup + ")"); break; } catch (Exception ex) { dup++; if (dup>10) break; }
                            }
                        }
                        populateHorasSheetFromTemplate(sheet, wb, nombre, fechaReporte, js, segmentosByRegistroId, perms, observacionesByRegistroId);
                    } else {
                        addHorasSheetWithSegmentosFallback(wb, nombre, fechaReporte, js, perms, observacionesByRegistroId, segmentosByRegistroId);
                    }
                    addViajesSheet(wb, nombre, fechaReporte, vs);
                }
                if (hasTemplate) {
                    // eliminar la plantilla original (índice 0) tras clonar
                    wb.removeSheetAt(0);
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generando Excel multi-usuario", e);
        }
    }

    private void populateHorasSheetFromTemplate(Sheet sheet, Workbook wb, String nombre, LocalDate fechaReporte,
                                                List<RegistroJornada> jornadas,
                                                Map<UUID, List<SegmentoExtra>> segmentosByRegistroId,
                                                Map<LocalDate, Permiso> permisosPorFecha,
                                                Map<UUID, String> observacionesByRegistroId) {
        // D5 = Nombre: + nombre, D6 = Fecha: + fecha, D7 cargo vacío
        try {
            Row rowNombre = sheet.getRow(4);
            if (rowNombre == null) rowNombre = sheet.createRow(4);
            Cell cD5 = rowNombre.getCell(3);
            if (cD5 == null) cD5 = rowNombre.createCell(3);
            cD5.setCellValue("Nombre: " + (nombre != null ? nombre : ""));
            // merged D5:J5 already exists, ensure style
        } catch (Exception ignored) {}
        try {
            Row rowFecha = sheet.getRow(5);
            if (rowFecha == null) rowFecha = sheet.createRow(5);
            Cell cD6 = rowFecha.getCell(3);
            if (cD6 == null) cD6 = rowFecha.createCell(3);
            String fechaStr = fechaReporte != null ? fechaReporte.format(DF_FECHA_REPORTE) : LocalDate.now(ZONA_BOGOTA).format(DF_FECHA_REPORTE);
            cD6.setCellValue("Fecha: " + fechaStr);
        } catch (Exception ignored) {}
        try {
            Row rowCargo = sheet.getRow(6);
            if (rowCargo != null) {
                Cell cD7 = rowCargo.getCell(3);
                if (cD7 != null) cD7.setCellValue("Cargo/Area:");
                // vacio
                for (int c = 4; c <= 9; c++) {
                    Cell cc = rowCargo.getCell(c);
                    if (cc != null) cc.setCellValue("");
                }
            }
        } catch (Exception ignored) {}

        // prepare estilos para filas nuevas (reusar row 9 estilo si existe)
        CellStyle centered = centeredStyle(wb);
        CellStyle wrap = wrapStyle(wb);
        // try to copy style from template row 8 (header) or row 9
        Row templateDataRow = sheet.getRow(8);
        if (templateDataRow != null) {
            // keep border style
        }

        // encontrar footer row (Autorizado por:)
        int footerRowIdx = -1;
        int lastRow = sheet.getLastRowNum();
        for (int r = 0; r <= lastRow; r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            for (int c = 0; c <= 9; c++) {
                Cell cell = row.getCell(c);
                if (cell != null && cell.getCellType() == CellType.STRING) {
                    String v = cell.getStringCellValue();
                    if (v != null && v.contains("Autorizado por")) {
                        footerRowIdx = r;
                        break;
                    }
                }
            }
            if (footerRowIdx != -1) break;
        }
        if (footerRowIdx == -1) footerRowIdx = 19; // default row 20

        int dataStartIdx = 8; // row 9
        // limpiar filas existentes de datos entre dataStartIdx y footerRowIdx-1
        for (int r = dataStartIdx; r < footerRowIdx; r++) {
            Row row = sheet.getRow(r);
            if (row != null) {
                // clear but keep row for reuse? We'll remove
                // sheet.removeRow(row); // but keep count
                for (int c = 1; c <= 9; c++) {
                    Cell cell = row.getCell(c);
                    if (cell != null) cell.setCellValue("");
                }
            }
        }

        int rowIdx = dataStartIdx;
        int maxRowsBeforeFooter = footerRowIdx - dataStartIdx;
        // si necesitamos más filas que espacio, desplazar footer
        // contar total filas necesarias
        int totalNeeded = 0;
        for (RegistroJornada r : jornadas) {
            List<SegmentoExtra> segs = segmentosByRegistroId != null ? segmentosByRegistroId.getOrDefault(r.getId(), null) : null;
            if (segs != null) {
                totalNeeded += segs.size();
            } else {
                List<TipoFila> filas = buildTipoFilas(r);
                // filtrar solo extra diurna/nocturna/dominical (quitar ordinaria)
                long cnt = filas.stream().filter(f -> !f.tipo.equals("Ordinaria") && !f.tipo.equals("Recargo Nocturno")).count();
                if (cnt == 0 && !filas.isEmpty()) {
                    // si solo ordinaria, no generar fila (solo extra)
                } else {
                    totalNeeded += cnt;
                }
            }
        }
        if (totalNeeded == 0) totalNeeded = 1; // al menos una fila vacía
        if (totalNeeded > maxRowsBeforeFooter) {
            int extra = totalNeeded - maxRowsBeforeFooter;
            sheet.shiftRows(footerRowIdx, lastRow, extra);
            // update footerRowIdx? keep but shifted
        }

        for (RegistroJornada r : jornadas) {
            Permiso permiso = null;
            if (permisosPorFecha != null && r.getFecha() != null) permiso = permisosPorFecha.get(r.getFecha());
            String obs = "";
            if (observacionesByRegistroId != null && r.getId() != null) obs = observacionesByRegistroId.getOrDefault(r.getId(), "");
            if (obs == null) obs = "";
            String permisoSN = permiso != null ? "SI" : "NO";
            String motivoPermiso = permiso != null && permiso.getDescripcion() != null ? permiso.getDescripcion() : "";
            String proyecto = r.getDescripcionProyectos() != null ? r.getDescripcionProyectos() : "";
            String diaStr = r.getFecha() != null ? r.getFecha().format(DF_DIA) : "";

            List<SegmentoExtra> segs = segmentosByRegistroId != null ? segmentosByRegistroId.get(r.getId()) : null;
            if (segs != null && !segs.isEmpty()) {
                for (SegmentoExtra seg : segs) {
                    Row row = sheet.getRow(rowIdx);
                    if (row == null) row = sheet.createRow(rowIdx);
                    // ensure cells B-J exist
                    for (int c = 1; c <= 9; c++) if (row.getCell(c) == null) row.createCell(c);
                    if (row.getCell(0) == null) row.createCell(0);
                    row.getCell(0).setCellStyle(centered);
                    row.getCell(1).setCellValue(diaStr); row.getCell(1).setCellStyle(centered);
                    row.getCell(2).setCellValue(formatZoned(seg.inicio())); row.getCell(2).setCellStyle(centered);
                    row.getCell(3).setCellValue(formatZoned(seg.fin())); row.getCell(3).setCellStyle(centered);
                    row.getCell(4).setCellValue(seg.cantidadHoras()); row.getCell(4).setCellStyle(centered);
                    row.getCell(5).setCellValue(seg.tipo()); row.getCell(5).setCellStyle(centered);
                    row.getCell(6).setCellValue(proyecto); row.getCell(6).setCellStyle(wrap);
                    row.getCell(7).setCellValue(permisoSN); row.getCell(7).setCellStyle(centered);
                    row.getCell(8).setCellValue(motivoPermiso); row.getCell(8).setCellStyle(wrap);
                    row.getCell(9).setCellValue(obs); row.getCell(9).setCellStyle(wrap);
                    rowIdx++;
                }
            } else {
                // fallback por horas fields (solo diurna/nocturna/dominical)
                List<TipoFila> filas = buildTipoFilas(r);
                // filtrar
                List<TipoFila> filtradas = filas.stream().filter(f -> f.tipo.equals("Extra Diurna") || f.tipo.equals("Extra Nocturna") || f.tipo.equals("Dominical/Festivo")).toList();
                if (filtradas.isEmpty()) continue;
                String horaInicioStr = formatHora(r.getHoraInicio());
                String horaFinStr = formatHora(r.getHoraFin());
                for (TipoFila tf : filtradas) {
                    Row row = sheet.getRow(rowIdx);
                    if (row == null) row = sheet.createRow(rowIdx);
                    for (int c = 1; c <= 9; c++) if (row.getCell(c) == null) row.createCell(c);
                    if (row.getCell(0) == null) row.createCell(0);
                    row.getCell(0).setCellStyle(centered);
                    row.getCell(1).setCellValue(diaStr); row.getCell(1).setCellStyle(centered);
                    row.getCell(2).setCellValue(horaInicioStr); row.getCell(2).setCellStyle(centered);
                    row.getCell(3).setCellValue(horaFinStr); row.getCell(3).setCellStyle(centered);
                    row.getCell(4).setCellValue(tf.cantidad.doubleValue()); row.getCell(4).setCellStyle(centered);
                    row.getCell(5).setCellValue(tf.tipo); row.getCell(5).setCellStyle(centered);
                    row.getCell(6).setCellValue(proyecto); row.getCell(6).setCellStyle(wrap);
                    row.getCell(7).setCellValue(permisoSN); row.getCell(7).setCellStyle(centered);
                    row.getCell(8).setCellValue(motivoPermiso); row.getCell(8).setCellStyle(wrap);
                    row.getCell(9).setCellValue(obs); row.getCell(9).setCellStyle(wrap);
                    rowIdx++;
                }
            }
        }

        if (rowIdx == dataStartIdx) {
            Row row = sheet.getRow(rowIdx);
            if (row == null) row = sheet.createRow(rowIdx);
            for (int c = 0; c <= 9; c++) {
                Cell cc = row.getCell(c);
                if (cc == null) cc = row.createCell(c);
                cc.setCellStyle(centered);
                if (c >= 1) cc.setCellValue("");
            }
            rowIdx++;
        }
        // ajustar ancho si es necesario (template ya tiene)
        // freeze
        try { sheet.createFreezePane(0, 8); } catch (Exception ignored) {}
        try { sheet.setAutoFilter(new CellRangeAddress(7, 7, 1, 9)); } catch (Exception ignored) {}
    }

    // fallback cuando no hay plantilla
    void addHorasSheetFallback(Workbook wb, String nombre, LocalDate fechaReporte,
                               List<RegistroJornada> jornadas,
                               Map<LocalDate, Permiso> permisosPorFecha,
                               Map<UUID, String> observacionesByRegistroId) {
        String sheetName = wb.getNumberOfSheets() == 0 ? "HORAS EXTRA Y PERMISOS" : "HORAS - " + sanitizeSheetName(nombre);
        if (sheetName.length() > 31) sheetName = sheetName.substring(0, 31);
        String base = sheetName; int dup=1; while (wb.getSheet(sheetName)!=null){String s=" ("+dup+")"; sheetName=base.substring(0,Math.min(base.length(),31-s.length()))+s; dup++;}
        Sheet sheet = wb.createSheet(sheetName);
        CellStyle headerStyle=headerStyle(wb); CellStyle titleStyle=titleStyle(wb); CellStyle labelStyle=labelStyle(wb); CellStyle valueStyle=valueStyle(wb); CellStyle centered=centeredStyle(wb);
        Row titleRow=sheet.createRow(0); titleRow.setHeightInPoints(18); Cell t=titleRow.createCell(0); t.setCellValue("CUADRO DE HORAS EXTRA Y PERMISOS"); t.setCellStyle(titleStyle); sheet.addMergedRegion(new CellRangeAddress(0,0,0,9));
        sheet.createRow(1); sheet.createRow(2); sheet.createRow(3);
        Row rN=sheet.createRow(4); Cell cD5=rN.createCell(3); cD5.setCellValue("Nombre: "+(nombre!=null?nombre:"")); cD5.setCellStyle(labelStyle); sheet.addMergedRegion(new CellRangeAddress(4,4,3,9)); for(int c=4;c<=9;c++){Cell cc=rN.createCell(c); cc.setCellStyle(valueStyle);}
        Row rF=sheet.createRow(5); Cell cD6=rF.createCell(3); cD6.setCellValue("Fecha: "+(fechaReporte!=null?fechaReporte.format(DF_FECHA_REPORTE):LocalDate.now(ZONA_BOGOTA).format(DF_FECHA_REPORTE))); cD6.setCellStyle(labelStyle); sheet.addMergedRegion(new CellRangeAddress(5,5,3,9)); for(int c=4;c<=9;c++){Cell cc=rF.createCell(c); cc.setCellStyle(valueStyle);}
        sheet.createRow(6);
        Row header=sheet.createRow(7); String[] h={"Dia","Hora inicio","Hora fin","Cantidad de horas extra","Tipo de horas extra","Proyecto/ Actividad","Permiso (SI/NO)","Motivo del permiso","Observaciones"}; for(int i=0;i<h.length;i++){Cell c=header.createCell(1+i); c.setCellValue(h[i]); c.setCellStyle(headerStyle);} header.createCell(0).setCellStyle(headerStyle); header.setHeightInPoints(30);
        int[] widths={4000,4000,4000,4000,5000,7000,4000,7000,7000}; for(int i=0;i<widths.length;i++) sheet.setColumnWidth(1+i,widths[i]); sheet.setColumnWidth(0,800);
        int rowIdx=8;
        for(RegistroJornada r: jornadas){
            Permiso p=permisosPorFecha!=null&&r.getFecha()!=null?permisosPorFecha.get(r.getFecha()):null;
            String obs=observacionesByRegistroId!=null&&r.getId()!=null?observacionesByRegistroId.getOrDefault(r.getId(),""):""; if(obs==null) obs="";
            String sn=p!=null?"SI":"NO"; String mot=p!=null&&p.getDescripcion()!=null?p.getDescripcion():""; String proj=r.getDescripcionProyectos()!=null?r.getDescripcionProyectos():""; String dia=r.getFecha()!=null?r.getFecha().format(DF_DIA):"";
            String hi=formatHora(r.getHoraInicio()); String hf=formatHora(r.getHoraFin());
            List<TipoFila> filas=buildTipoFilas(r).stream().filter(f->f.tipo.equals("Extra Diurna")||f.tipo.equals("Extra Nocturna")||f.tipo.equals("Dominical/Festivo")).toList();
            for(TipoFila tf: filas){ Row row=sheet.createRow(rowIdx++); row.createCell(0).setCellStyle(centered); Cell cB=row.createCell(1); cB.setCellValue(dia); cB.setCellStyle(centered); Cell cC=row.createCell(2); cC.setCellValue(hi); cC.setCellStyle(centered); Cell cD=row.createCell(3); cD.setCellValue(hf); cD.setCellStyle(centered); Cell cE=row.createCell(4); cE.setCellValue(tf.cantidad.doubleValue()); cE.setCellStyle(centered); Cell cF=row.createCell(5); cF.setCellValue(tf.tipo); cF.setCellStyle(centered); Cell cG=row.createCell(6); cG.setCellValue(proj); cG.setCellStyle(wrapStyle(wb)); Cell cH=row.createCell(7); cH.setCellValue(sn); cH.setCellStyle(centered); Cell cI=row.createCell(8); cI.setCellValue(mot); cI.setCellStyle(wrapStyle(wb)); Cell cJ=row.createCell(9); cJ.setCellValue(obs); cJ.setCellStyle(wrapStyle(wb)); }
        }
        if(rowIdx==8){ Row row=sheet.createRow(rowIdx++); for(int c=0;c<=9;c++){Cell cc=row.createCell(c); cc.setCellStyle(centered);}}
        sheet.createFreezePane(0,8); sheet.setAutoFilter(new CellRangeAddress(7,7,1,9));
    }

    void addHorasSheetWithSegmentosFallback(Workbook wb, String nombre, LocalDate fechaReporte,
                                           List<RegistroJornada> jornadas,
                                           Map<LocalDate, Permiso> permisosPorFecha,
                                           Map<UUID, String> observacionesByRegistroId,
                                           Map<UUID, List<SegmentoExtra>> segmentosByRegistroId) {
        String sheetName = wb.getNumberOfSheets() == 0 ? "HORAS EXTRA Y PERMISOS" : "HORAS - " + sanitizeSheetName(nombre);
        if (sheetName.length() > 31) sheetName = sheetName.substring(0, 31);
        String base = sheetName; int dup=1; while (wb.getSheet(sheetName)!=null){String s=" ("+dup+")"; sheetName=base.substring(0,Math.min(base.length(),31-s.length()))+s; dup++;}
        Sheet sheet = wb.createSheet(sheetName);
        CellStyle headerStyle=headerStyle(wb); CellStyle titleStyle=titleStyle(wb); CellStyle labelStyle=labelStyle(wb); CellStyle valueStyle=valueStyle(wb); CellStyle centered=centeredStyle(wb);
        Row titleRow=sheet.createRow(0); titleRow.setHeightInPoints(18); Cell t=titleRow.createCell(0); t.setCellValue("CUADRO DE HORAS EXTRA Y PERMISOS"); t.setCellStyle(titleStyle); sheet.addMergedRegion(new CellRangeAddress(0,0,0,9));
        sheet.createRow(1); sheet.createRow(2); sheet.createRow(3);
        Row rN=sheet.createRow(4); Cell cD5=rN.createCell(3); cD5.setCellValue("Nombre: "+(nombre!=null?nombre:"")); cD5.setCellStyle(labelStyle); sheet.addMergedRegion(new CellRangeAddress(4,4,3,9)); for(int c=4;c<=9;c++){Cell cc=rN.createCell(c); cc.setCellStyle(valueStyle);}
        Row rF=sheet.createRow(5); Cell cD6=rF.createCell(3); cD6.setCellValue("Fecha: "+(fechaReporte!=null?fechaReporte.format(DF_FECHA_REPORTE):LocalDate.now(ZONA_BOGOTA).format(DF_FECHA_REPORTE))); cD6.setCellStyle(labelStyle); sheet.addMergedRegion(new CellRangeAddress(5,5,3,9)); for(int c=4;c<=9;c++){Cell cc=rF.createCell(c); cc.setCellStyle(valueStyle);}
        sheet.createRow(6);
        Row header=sheet.createRow(7); String[] h={"Dia","Hora inicio","Hora fin","Cantidad de horas extra","Tipo de horas extra","Proyecto/ Actividad","Permiso (SI/NO)","Motivo del permiso","Observaciones"}; for(int i=0;i<h.length;i++){Cell c=header.createCell(1+i); c.setCellValue(h[i]); c.setCellStyle(headerStyle);} header.createCell(0).setCellStyle(headerStyle); header.setHeightInPoints(30);
        int[] widths={4000,4000,4000,4000,5000,7000,4000,7000,7000}; for(int i=0;i<widths.length;i++) sheet.setColumnWidth(1+i,widths[i]); sheet.setColumnWidth(0,800);
        int rowIdx=8;
        for(RegistroJornada r: jornadas){
            Permiso p=permisosPorFecha!=null&&r.getFecha()!=null?permisosPorFecha.get(r.getFecha()):null;
            String obs=observacionesByRegistroId!=null&&r.getId()!=null?observacionesByRegistroId.getOrDefault(r.getId(),""):""; if(obs==null) obs="";
            String sn=p!=null?"SI":"NO"; String mot=p!=null&&p.getDescripcion()!=null?p.getDescripcion():""; String proj=r.getDescripcionProyectos()!=null?r.getDescripcionProyectos():""; String dia=r.getFecha()!=null?r.getFecha().format(DF_DIA):"";
            List<SegmentoExtra> segs=segmentosByRegistroId!=null?segmentosByRegistroId.getOrDefault(r.getId(), List.of()): List.of();
            for(SegmentoExtra seg: segs){ Row row=sheet.createRow(rowIdx++); row.createCell(0).setCellStyle(centered); Cell cB=row.createCell(1); cB.setCellValue(dia); cB.setCellStyle(centered); Cell cC=row.createCell(2); cC.setCellValue(formatZoned(seg.inicio())); cC.setCellStyle(centered); Cell cD=row.createCell(3); cD.setCellValue(formatZoned(seg.fin())); cD.setCellStyle(centered); Cell cE=row.createCell(4); cE.setCellValue(seg.cantidadHoras()); cE.setCellStyle(centered); Cell cF=row.createCell(5); cF.setCellValue(seg.tipo()); cF.setCellStyle(centered); Cell cG=row.createCell(6); cG.setCellValue(proj); cG.setCellStyle(wrapStyle(wb)); Cell cH=row.createCell(7); cH.setCellValue(sn); cH.setCellStyle(centered); Cell cI=row.createCell(8); cI.setCellValue(mot); cI.setCellStyle(wrapStyle(wb)); Cell cJ=row.createCell(9); cJ.setCellValue(obs); cJ.setCellStyle(wrapStyle(wb)); }
        }
        if(rowIdx==8){ Row row=sheet.createRow(rowIdx++); for(int c=0;c<=9;c++){Cell cc=row.createCell(c); cc.setCellStyle(centered);}}
        sheet.createFreezePane(0,8); sheet.setAutoFilter(new CellRangeAddress(7,7,1,9));
    }

    void addViajesSheet(Workbook wb, String nombre, LocalDate fechaReporte, List<Viaje> viajes) {
        String sheetName = wb.getNumberOfSheets() == 0 ? "VIAJES" : "VIAJES - " + sanitizeSheetName(nombre);
        if (sheetName.length() > 31) sheetName = sheetName.substring(0, 31);
        String base = sheetName;
        int dup = 1;
        while (wb.getSheet(sheetName) != null) {
            String suffix = " (" + dup + ")";
            sheetName = base.substring(0, Math.min(base.length(), 31 - suffix.length())) + suffix;
            dup++;
        }
        Sheet sheet = wb.createSheet(sheetName);
        CellStyle headerStyle = headerStyle(wb);
        CellStyle titleStyle = titleStyle(wb);
        CellStyle labelStyle = labelStyle(wb);
        CellStyle valueStyle = valueStyle(wb);
        CellStyle centered = centeredStyle(wb);

        Row titleRow = sheet.createRow(0);
        titleRow.setHeightInPoints(18);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("CUADRO DE VIAJES");
        titleCell.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 4));

        sheet.createRow(1); sheet.createRow(2); sheet.createRow(3);

        Row rowNombre = sheet.createRow(4);
        Cell cD5 = rowNombre.createCell(1);
        cD5.setCellValue("Nombre: " + (nombre != null ? nombre : ""));
        cD5.setCellStyle(labelStyle);
        sheet.addMergedRegion(new CellRangeAddress(4, 4, 1, 4));
        for (int c = 3; c <= 4; c++) { Cell cc = rowNombre.createCell(c); cc.setCellStyle(valueStyle); }

        Row rowFecha = sheet.createRow(5);
        Cell cD6 = rowFecha.createCell(1);
        cD6.setCellValue("Fecha: " + (fechaReporte != null ? fechaReporte.format(DF_FECHA_REPORTE) : LocalDate.now(ZONA_BOGOTA).format(DF_FECHA_REPORTE)));
        cD6.setCellStyle(labelStyle);
        sheet.addMergedRegion(new CellRangeAddress(5, 5, 1, 4));
        for (int c = 3; c <= 4; c++) { Cell cc = rowFecha.createCell(c); cc.setCellStyle(valueStyle); }

        sheet.createRow(6);
        Row header = sheet.createRow(7);
        String[] headers = {"DIA", "INICIO", "FINAL", "DETALLE"};
        for (int i = 0; i < headers.length; i++) {
            int col = 1 + i;
            Cell c = header.createCell(col);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }
        Cell aHeader = header.createCell(0);
        aHeader.setCellStyle(headerStyle);
        header.setHeightInPoints(20);
        int[] widths = {4000, 6000, 6000, 10000};
        for (int i = 0; i < widths.length; i++) sheet.setColumnWidth(1 + i, widths[i]);
        sheet.setColumnWidth(0, 800);

        int rowIdx = 8;
        for (Viaje v : viajes) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellStyle(centered);
            Cell cB = row.createCell(1); cB.setCellValue(v.getFecha() != null ? v.getFecha().format(DF_DIA) : ""); cB.setCellStyle(centered);
            Cell cC = row.createCell(2); cC.setCellValue(v.getPuntoPartida() != null ? v.getPuntoPartida() : ""); cC.setCellStyle(centered);
            Cell cD = row.createCell(3); cD.setCellValue(v.getPuntoFinal() != null ? v.getPuntoFinal() : ""); cD.setCellStyle(centered);
            Cell cE = row.createCell(4); cE.setCellValue(v.getDescripcion() != null ? v.getDescripcion() : ""); cE.setCellStyle(wrapStyle(wb));
        }
        if (rowIdx == 8) {
            Row row = sheet.createRow(rowIdx++);
            for (int c = 0; c <= 4; c++) { Cell cc = row.createCell(c); cc.setCellStyle(centered); }
        }
        sheet.createFreezePane(0, 8);
        sheet.setAutoFilter(new CellRangeAddress(7, 7, 1, 4));
    }

    // legacy private builds kept for internal compat
    private void buildHorasSheet(Workbook wb, List<RegistroJornada> jornadas) {
        addHorasSheetFallback(wb, "Usuario", LocalDate.now(ZONA_BOGOTA), jornadas, Map.of(), Map.of());
    }

    private void buildViajesSheet(Workbook wb, List<Viaje> viajes) {
        addViajesSheet(wb, "Usuario", LocalDate.now(ZONA_BOGOTA), viajes);
    }

    private List<TipoFila> buildTipoFilas(RegistroJornada r) {
        List<TipoFila> list = new java.util.ArrayList<>();
        if (nz(r.getHorasOrdinarias()).compareTo(BigDecimal.ZERO) > 0) list.add(new TipoFila("Ordinaria", r.getHorasOrdinarias()));
        if (nz(r.getHorasExtraDiurnas()).compareTo(BigDecimal.ZERO) > 0) list.add(new TipoFila("Extra Diurna", r.getHorasExtraDiurnas()));
        if (nz(r.getHorasExtraNocturnas()).compareTo(BigDecimal.ZERO) > 0) list.add(new TipoFila("Extra Nocturna", r.getHorasExtraNocturnas()));
        if (nz(r.getHorasRecargoNocturno()).compareTo(BigDecimal.ZERO) > 0) list.add(new TipoFila("Recargo Nocturno", r.getHorasRecargoNocturno()));
        if (nz(r.getHorasDominicalFestivo()).compareTo(BigDecimal.ZERO) > 0) list.add(new TipoFila("Dominical/Festivo", r.getHorasDominicalFestivo()));
        return list;
    }

    private String sanitizeSheetName(String s) {
        if (s == null) return "Usuario";
        return s.replaceAll("[\\\\/*?:\\[\\]]", "_").trim();
    }

    private String formatHora(Instant instant) {
        if (instant == null) return "";
        ZonedDateTime z = instant.atZone(ZoneId.of("UTC")).withZoneSameInstant(ZONA_BOGOTA);
        return z.format(TF_HORA);
    }

    private String formatZoned(ZonedDateTime z) {
        if (z == null) return "";
        return z.format(TF_HORA);
    }

    private CellStyle headerStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
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
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        s.setBorderBottom(BorderStyle.THIN);
        s.setBorderTop(BorderStyle.THIN);
        s.setBorderLeft(BorderStyle.THIN);
        s.setBorderRight(BorderStyle.THIN);
        s.setWrapText(true);
        return s;
    }

    private CellStyle titleStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        s.setAlignment(HorizontalAlignment.CENTER);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        Font f = wb.createFont();
        f.setBold(true);
        f.setFontHeightInPoints((short)14);
        s.setFont(f);
        return s;
    }

    private CellStyle labelStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        s.setAlignment(HorizontalAlignment.LEFT);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        Font f = wb.createFont();
        f.setBold(true);
        s.setFont(f);
        return s;
    }

    private CellStyle valueStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        s.setAlignment(HorizontalAlignment.LEFT);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        return s;
    }

    private CellStyle centeredStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        s.setAlignment(HorizontalAlignment.CENTER);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        s.setBorderBottom(BorderStyle.THIN);
        s.setBorderTop(BorderStyle.THIN);
        s.setBorderLeft(BorderStyle.THIN);
        s.setBorderRight(BorderStyle.THIN);
        s.setWrapText(true);
        return s;
    }

    private CellStyle wrapStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        s.setAlignment(HorizontalAlignment.LEFT);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        s.setBorderBottom(BorderStyle.THIN);
        s.setBorderTop(BorderStyle.THIN);
        s.setBorderLeft(BorderStyle.THIN);
        s.setBorderRight(BorderStyle.THIN);
        s.setWrapText(true);
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

    private record TipoFila(String tipo, BigDecimal cantidad) {}
}
