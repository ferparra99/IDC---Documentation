package com.idc.timetracker.modules.holiday;

import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ColombianHolidaysServiceTest {

    private final ColombianHolidaysService svc = new ColombianHolidaysService();

    @Test
    void calcula18Festivos2026() {
        List<ColombianHolidaysService.FestivoCalculado> festivos = svc.calcularParaAnio(2026);
        assertEquals(18, festivos.size());
        assertEquals(List.of(
                new ColombianHolidaysService.FestivoCalculado("2026-01-01", "Año Nuevo"),
                new ColombianHolidaysService.FestivoCalculado("2026-01-12", "Reyes Magos"),
                new ColombianHolidaysService.FestivoCalculado("2026-03-23", "San José"),
                new ColombianHolidaysService.FestivoCalculado("2026-04-02", "Jueves Santo"),
                new ColombianHolidaysService.FestivoCalculado("2026-04-03", "Viernes Santo"),
                new ColombianHolidaysService.FestivoCalculado("2026-05-01", "Día del Trabajo"),
                new ColombianHolidaysService.FestivoCalculado("2026-05-18", "Ascensión del Señor"),
                new ColombianHolidaysService.FestivoCalculado("2026-06-08", "Corpus Christi"),
                new ColombianHolidaysService.FestivoCalculado("2026-06-15", "Sagrado Corazón de Jesús"),
                new ColombianHolidaysService.FestivoCalculado("2026-06-29", "San Pedro y San Pablo"),
                new ColombianHolidaysService.FestivoCalculado("2026-07-20", "Independencia de Colombia"),
                new ColombianHolidaysService.FestivoCalculado("2026-08-07", "Batalla de Boyacá"),
                new ColombianHolidaysService.FestivoCalculado("2026-08-17", "Asunción de la Virgen"),
                new ColombianHolidaysService.FestivoCalculado("2026-10-12", "Día de la Raza"),
                new ColombianHolidaysService.FestivoCalculado("2026-11-02", "Todos los Santos"),
                new ColombianHolidaysService.FestivoCalculado("2026-11-16", "Independencia de Cartagena"),
                new ColombianHolidaysService.FestivoCalculado("2026-12-08", "Inmaculada Concepción"),
                new ColombianHolidaysService.FestivoCalculado("2026-12-25", "Navidad")
        ), festivos);
    }

    @Test
    void calculaPascuaCorrectamente() {
        assertTrue(svc.calcularParaAnio(2024).contains(new ColombianHolidaysService.FestivoCalculado("2024-03-28", "Jueves Santo")));
        assertTrue(svc.calcularParaAnio(2024).contains(new ColombianHolidaysService.FestivoCalculado("2024-03-29", "Viernes Santo")));
        assertTrue(svc.calcularParaAnio(2025).contains(new ColombianHolidaysService.FestivoCalculado("2025-04-17", "Jueves Santo")));
    }

    @Test
    void noTrasladaFijos() {
        for (int anio : List.of(2024,2025,2026,2027)) {
            var f = svc.calcularParaAnio(anio);
            assertTrue(f.contains(new ColombianHolidaysService.FestivoCalculado(anio+"-01-01", "Año Nuevo")));
            assertTrue(f.contains(new ColombianHolidaysService.FestivoCalculado(anio+"-05-01", "Día del Trabajo")));
        }
    }

    @Test
    void trasladableEnLunesNoSeMueve() {
        assertTrue(svc.calcularParaAnio(2025).contains(new ColombianHolidaysService.FestivoCalculado("2025-01-06", "Reyes Magos")));
    }

    @Test
    void trasladablesSiempreLunes() {
        Set<String> trasladables = Set.of("Reyes Magos","San José","Ascensión del Señor","Corpus Christi","Sagrado Corazón de Jesús","San Pedro y San Pablo","Asunción de la Virgen","Día de la Raza","Todos los Santos","Independencia de Cartagena");
        for (int anio : List.of(2023,2024,2025,2026,2027)) {
            for (var fest : svc.calcularParaAnio(anio)) {
                if (trasladables.contains(fest.nombre())) {
                    DayOfWeek dow = LocalDate.parse(fest.fecha()).getDayOfWeek();
                    assertEquals(DayOfWeek.MONDAY, dow, fest.nombre()+" "+fest.fecha());
                }
            }
        }
    }

    @Test
    void siempre18Ordenados() {
        for (int anio : List.of(2023,2024,2025,2026)) {
            var f = svc.calcularParaAnio(anio);
            assertEquals(18, f.size());
            var sorted = f.stream().map(ColombianHolidaysService.FestivoCalculado::fecha).sorted().toList();
            assertEquals(sorted, f.stream().map(ColombianHolidaysService.FestivoCalculado::fecha).toList());
        }
    }

    @Test
    void deterministico() {
        assertEquals(svc.calcularParaAnio(2026), svc.calcularParaAnio(2026));
    }
}
