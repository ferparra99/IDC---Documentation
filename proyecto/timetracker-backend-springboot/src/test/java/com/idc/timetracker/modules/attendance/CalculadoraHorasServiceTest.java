package com.idc.timetracker.modules.attendance;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;

class CalculadoraHorasServiceTest {

    private final CalculadoraHorasService calc = new CalculadoraHorasService("19:00", "06:00", 8, ZoneId.of("America/Bogota"));

    private Instant bogota(String hora, String fecha) {
        String[] hm = hora.split(":");
        int hh = Integer.parseInt(hm[0]);
        int mm = Integer.parseInt(hm[1]);
        int horaUtc = (hh + 5) % 24;
        int diaExtra = (hh + 5) >= 24 ? 1 : 0;
        // fecha YYYY-MM-DD
        String[] ymd = fecha.split("-");
        int y = Integer.parseInt(ymd[0]), m = Integer.parseInt(ymd[1]), d = Integer.parseInt(ymd[2]) + diaExtra;
        // use UTC
        java.time.LocalDate ld = java.time.LocalDate.of(y, m, 1).withDayOfMonth(Math.min(d, java.time.LocalDate.of(y,m,1).lengthOfMonth()));
        // simpler: use Instant via ZonedDateTime Bogota -> UTC
        java.time.ZonedDateTime bogotaTime = java.time.ZonedDateTime.of(y, Integer.parseInt(ymd[1]), Integer.parseInt(ymd[2]), hh, mm, 0, 0, ZoneId.of("America/Bogota"));
        if (diaExtra == 1) {
            // already handled by hh+5 logic? Use Bogota direct then convert
        }
        // Actually easiest: create in Bogota zone directly
        java.time.ZonedDateTime zdt = java.time.ZonedDateTime.of(
                Integer.parseInt(ymd[0]), Integer.parseInt(ymd[1]), Integer.parseInt(ymd[2]),
                hh, mm, 0, 0, ZoneId.of("America/Bogota"));
        return zdt.toInstant();
    }

    private Instant bogota(String hora) { return bogota(hora, "2026-08-31"); }

    @Test
    void jornada8hDiurnaQueda100Ordinaria() {
        DesgloseHoras r = calc.calcular(bogota("08:00"), bogota("16:00"), false);
        assertEquals(8, r.horasOrdinarias());
        assertEquals(0, r.horasExtraDiurnas());
        assertEquals(0, r.horasExtraNocturnas());
        assertEquals(0, r.horasRecargoNocturno());
        assertEquals(0, r.horasDominicalFestivo());
    }

    @Test
    void jornada9hSepara8Ordinarias1ExtraDiurna() {
        DesgloseHoras r = calc.calcular(bogota("08:00"), bogota("17:00"), false);
        assertEquals(8, r.horasOrdinarias());
        assertEquals(1, r.horasExtraDiurnas());
        assertEquals(0, r.horasExtraNocturnas());
    }

    @Test
    void jornada14a22GeneraRecargoNocturnoNoExtra() {
        DesgloseHoras r = calc.calcular(bogota("14:00"), bogota("22:00"), false);
        assertEquals(5, r.horasOrdinarias());
        assertEquals(3, r.horasRecargoNocturno());
    }

    @Test
    void jornada13hSeparaExtraDiurnaYNocturna() {
        DesgloseHoras r = calc.calcular(bogota("08:00"), bogota("21:00"), false);
        assertEquals(8, r.horasOrdinarias());
        assertEquals(3, r.horasExtraDiurnas());
        assertEquals(2, r.horasExtraNocturnas());
    }

    @Test
    void jornadaNocturnaIntegraEs100Recargo() {
        Instant inicio = bogota("20:00", "2026-08-31");
        Instant fin = bogota("04:00", "2026-09-01");
        DesgloseHoras r = calc.calcular(inicio, fin, false);
        assertEquals(0, r.horasOrdinarias());
        assertEquals(8, r.horasRecargoNocturno());
    }

    @Test
    void domingoFestivoTodoADominical() {
        DesgloseHoras r = calc.calcular(bogota("08:00"), bogota("17:00"), true);
        assertEquals(0, r.horasOrdinarias());
        assertEquals(9, r.horasDominicalFestivo());
    }

    @Test
    void redondeaADosDecimales() {
        DesgloseHoras r = calc.calcular(bogota("08:00"), bogota("08:10"), false);
        assertEquals(0.17, r.horasOrdinarias());
    }

    @Test
    void lanzaSiFinNoPosterior() {
        assertThrows(IllegalArgumentException.class, () -> calc.calcular(bogota("17:00"), bogota("08:00"), false));
    }

    @Test
    void respetaFranjaNocturnaCustom() {
        CalculadoraHorasService custom = new CalculadoraHorasService("21:00", "05:00", 8, ZoneId.of("America/Bogota"));
        DesgloseHoras r = custom.calcular(bogota("14:00"), bogota("22:00"), false);
        assertEquals(1, r.horasRecargoNocturno());
        assertEquals(7, r.horasOrdinarias());
    }
}
