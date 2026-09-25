package com.idc.timetracker.modules.report;

import com.idc.timetracker.modules.attendance.EstadoJornada;
import com.idc.timetracker.modules.attendance.RegistroJornada;
import com.idc.timetracker.modules.leave.Permiso;
import com.idc.timetracker.modules.leave.TipoPermiso;
import com.idc.timetracker.modules.trip.Viaje;
import com.idc.timetracker.modules.user.Usuario;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ExcelReportBuilderTest {

    private ExcelReportBuilder builder;

    @BeforeEach
    void setup() {
        builder = new ExcelReportBuilder();
    }

    private boolean containsTitle(Sheet sheet, String title) {
        for (Row row : sheet) {
            for (Cell c : row) {
                if (c.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
                    if (title.equals(c.getStringCellValue())) return true;
                }
            }
        }
        return false;
    }

    @Test
    void buildConListasVaciasGenera2HojasConPlantilla() throws Exception {
        byte[] bytes = builder.build(Collections.emptyList(), Collections.emptyList());

        assertNotNull(bytes);
        assertTrue(bytes.length > 0);

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals(2, wb.getNumberOfSheets());
            assertTrue(wb.getSheetAt(0).getSheetName().contains("HORAS"));
            assertTrue(wb.getSheetAt(1).getSheetName().contains("VIAJES"));

            Sheet horas = wb.getSheetAt(0);
            assertTrue(containsTitle(horas, "CUADRO DE HORAS EXTRA Y PERMISOS"));
            // merged D5:J5 (row 4 col 3-9) debe existir (plantilla)
            boolean foundNombreMerge = false;
            for (CellRangeAddress cra : horas.getMergedRegions()) {
                if (cra.getFirstRow() == 4 && cra.getFirstColumn() == 3 && cra.getLastColumn() == 9) foundNombreMerge = true;
            }
            assertTrue(foundNombreMerge, "Debe existir merge D5:J5 Nombre");
            // header en fila 7 (index 7) col B=1 = Dia
            assertEquals("Dia", horas.getRow(7).getCell(1).getStringCellValue().trim());
            assertEquals("Hora inicio", horas.getRow(7).getCell(2).getStringCellValue());
            assertEquals("Observaciones", horas.getRow(7).getCell(9).getStringCellValue());

            Sheet viajes = wb.getSheetAt(1);
            assertTrue(containsTitle(viajes, "CUADRO DE VIAJES") || viajes.getSheetName().contains("VIAJES"));
            assertEquals("DIA", viajes.getRow(7).getCell(1).getStringCellValue());
        }
    }

    @Test
    void buildCon1JornadaY1ViajeGeneraFilasPorTipo() throws Exception {
        Usuario u = Usuario.builder().id(UUID.randomUUID()).email("a@a.com").nombre("A").build();
        // Con nueva regla 08-17:30: 13:00UTC=08 Bogota, 21:00UTC=16 Bogota => dentro de horario, sin extra? Usa 13-21 UTC => 08-16 Bogota => laboral 7h, extra 0
        // Para generar 1 fila extra, usamos 06:00-08:00 Bogota extra diurna 2h? Pero builder filtra solo extra diurna/nocturna/dominical.
        // Creamos jornada con Extra Diurna 1 ya persistida (fallback por horas fields)
        RegistroJornada r = RegistroJornada.builder()
                .id(UUID.randomUUID())
                .usuario(u)
                .fecha(LocalDate.of(2026, 3, 10))
                .estado(EstadoJornada.JORNADA_FINALIZADA)
                .horaInicio(Instant.parse("2026-03-10T13:00:00Z"))
                .horaFin(Instant.parse("2026-03-10T21:00:00Z"))
                .horasOrdinarias(new BigDecimal("8.00"))
                .horasExtraDiurnas(new BigDecimal("1.00"))
                .horasExtraNocturnas(BigDecimal.ZERO)
                .horasRecargoNocturno(BigDecimal.ZERO)
                .horasDominicalFestivo(BigDecimal.ZERO)
                .descripcionProyectos("Canal 1")
                .build();
        Viaje v = Viaje.builder()
                .id(UUID.randomUUID())
                .usuario(u)
                .fecha(LocalDate.of(2026, 3, 11))
                .puntoPartida("Bogota")
                .puntoFinal("Medellin")
                .descripcion("Test viaje")
                .valor(new BigDecimal("5000.00"))
                .build();

        byte[] bytes = builder.build(List.of(r), List.of(v));

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet horas = wb.getSheetAt(0);
            // con filtro sin Ordinaria, solo 1 fila extra diurna
            assertEquals("10/3/2026", horas.getRow(8).getCell(1).getStringCellValue());
            assertEquals(1.0, horas.getRow(8).getCell(4).getNumericCellValue(), 0.001);
            assertEquals("Extra Diurna", horas.getRow(8).getCell(5).getStringCellValue());
            assertEquals("Canal 1", horas.getRow(8).getCell(6).getStringCellValue());

            Sheet viajes = wb.getSheetAt(1);
            assertEquals("11/3/2026", viajes.getRow(8).getCell(1).getStringCellValue());
            assertEquals("Bogota", viajes.getRow(8).getCell(2).getStringCellValue());
            assertEquals("Medellin", viajes.getRow(8).getCell(3).getStringCellValue());
            assertEquals("Test viaje", viajes.getRow(8).getCell(4).getStringCellValue());
        }
    }

    @Test
    void buildConNombreFechaPermisoYObservaciones() throws Exception {
        Usuario u = Usuario.builder().id(UUID.randomUUID()).email("jose@empresa.com").nombre("JOSE FERNANDO PARRA POSADA").build();
        RegistroJornada r = RegistroJornada.builder()
                .id(UUID.randomUUID())
                .usuario(u)
                .fecha(LocalDate.of(2026, 9, 12))
                .estado(EstadoJornada.JORNADA_FINALIZADA)
                .horaInicio(Instant.parse("2026-09-12T13:00:00Z"))
                .horaFin(Instant.parse("2026-09-12T22:30:00Z"))
                .horasOrdinarias(new BigDecimal("8.00"))
                .horasExtraDiurnas(new BigDecimal("1.50"))
                .horasExtraNocturnas(BigDecimal.ZERO)
                .horasRecargoNocturno(BigDecimal.ZERO)
                .horasDominicalFestivo(BigDecimal.ZERO)
                .descripcionProyectos("Canal 1")
                .build();
        Permiso p = Permiso.builder().usuario(u).fechaSolicitud(LocalDate.of(2026, 9, 12))
                .horas(new BigDecimal("2")).tipo(TipoPermiso.PARCIAL).descripcion("Cita medica").build();
        Map<LocalDate, Permiso> perms = Map.of(LocalDate.of(2026, 9, 12), p);
        Map<UUID, String> obs = Map.of(r.getId(), "Cambio de horario autorizado");

        byte[] bytes = builder.build("JOSE FERNANDO PARRA POSADA", LocalDate.of(2026, 9, 13), List.of(r), List.of(), perms, obs);

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet horas = wb.getSheetAt(0);
            // Nombre: en D5 (row4 col3) debe contener nombre
            String nombreCell = horas.getRow(4).getCell(3).getStringCellValue();
            assertTrue(nombreCell.contains("JOSE FERNANDO PARRA POSADA"), "D5 debe contener Nombre: JOSE..., fue: " + nombreCell);
            String fechaCell = horas.getRow(5).getCell(3).getStringCellValue();
            assertTrue(fechaCell.contains("13/09/2026"), "D6 debe contener Fecha: 13/09/2026, fue: " + fechaCell);
            // fila 8 debe ser Extra Diurna 1.5
            assertEquals("SI", horas.getRow(8).getCell(7).getStringCellValue());
            assertEquals("Cita medica", horas.getRow(8).getCell(8).getStringCellValue());
            assertEquals("Cambio de horario autorizado", horas.getRow(8).getCell(9).getStringCellValue());
            assertEquals("Extra Diurna", horas.getRow(8).getCell(5).getStringCellValue());
        }
    }

    @Test
    void noLanzaExcepcion() {
        assertDoesNotThrow(() -> builder.build(Collections.emptyList(), Collections.emptyList()));
        Usuario u = Usuario.builder().id(UUID.randomUUID()).email("b@b.com").build();
        RegistroJornada r = RegistroJornada.builder().usuario(u).fecha(LocalDate.now()).build();
        Viaje v = Viaje.builder().usuario(u).fecha(LocalDate.now()).puntoPartida("A").puntoFinal("B").descripcion("d").valor(BigDecimal.TEN).build();
        assertDoesNotThrow(() -> builder.build(List.of(r), List.of(v)));
    }
}
