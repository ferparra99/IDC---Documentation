package com.idc.timetracker.modules.report;

import com.idc.timetracker.modules.attendance.EstadoJornada;
import com.idc.timetracker.modules.attendance.RegistroJornada;
import com.idc.timetracker.modules.trip.Viaje;
import com.idc.timetracker.modules.user.Usuario;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ExcelReportBuilderTest {

    private ExcelReportBuilder builder;

    @BeforeEach
    void setup() {
        builder = new ExcelReportBuilder();
    }

    @Test
    void buildConListasVaciasGenera2HojasConHeaders() throws Exception {
        byte[] bytes = builder.build(Collections.emptyList(), Collections.emptyList());

        assertNotNull(bytes);
        assertTrue(bytes.length > 0);

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals(2, wb.getNumberOfSheets());
            assertEquals("Horas laboradas", wb.getSheetAt(0).getSheetName());
            assertEquals("Viajes laborados", wb.getSheetAt(1).getSheetName());

            Sheet horas = wb.getSheetAt(0);
            assertEquals("Fecha", horas.getRow(0).getCell(0).getStringCellValue());
            Sheet viajes = wb.getSheetAt(1);
            assertEquals("Fecha", viajes.getRow(0).getCell(0).getStringCellValue());
        }
    }

    @Test
    void buildCon1JornadaY1ViajeGeneraFilasYTotales() throws Exception {
        Usuario u = Usuario.builder().id(UUID.randomUUID()).email("a@a.com").nombre("A").build();
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
            Sheet horas = wb.getSheet("Horas laboradas");
            // header + 1 data + 1 total = 3 rows -> last row index 2
            assertEquals(3, horas.getPhysicalNumberOfRows());
            assertEquals("2026-03-10", horas.getRow(1).getCell(0).getStringCellValue());
            // total row label
            assertEquals("TOTAL", horas.getRow(2).getCell(0).getStringCellValue());
            // total ordinarias 8.0
            assertEquals(8.0, horas.getRow(2).getCell(5).getNumericCellValue(), 0.001);

            Sheet viajes = wb.getSheet("Viajes laborados");
            assertEquals(3, viajes.getPhysicalNumberOfRows());
            assertEquals("2026-03-11", viajes.getRow(1).getCell(0).getStringCellValue());
            assertEquals(5000.0, viajes.getRow(2).getCell(5).getNumericCellValue(), 0.001);
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
