package com.idc.timetracker.modules.attendance;

import com.idc.timetracker.common.config.AppProperties;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.temporal.ChronoUnit;

/**
 * Replica exacta de src/domain/services/CalculadoraHorasService.ts
 */
@Service
public class CalculadoraHorasService {

    private final ZoneId zona;
    private final String inicioNocturno;
    private final String finNocturno;
    private final double horasOrdinariasPorDia;

    @org.springframework.beans.factory.annotation.Autowired
    public CalculadoraHorasService(AppProperties props) {
        this.zona = ZoneId.of(props.getZonaHoraria());
        this.inicioNocturno = "19:00";
        this.finNocturno = "06:00";
        this.horasOrdinariasPorDia = 8;
    }

    // Constructor para tests con config custom
    public CalculadoraHorasService(String inicioNocturno, String finNocturno, double horasOrdinariasPorDia, ZoneId zona) {
        this.inicioNocturno = inicioNocturno;
        this.finNocturno = finNocturno;
        this.horasOrdinariasPorDia = horasOrdinariasPorDia;
        this.zona = zona;
    }

    public DesgloseHoras calcular(Instant horaInicioUtc, Instant horaFinUtc, boolean esDominicalOFestivo) {
        ZonedDateTime inicio = horaInicioUtc.atZone(ZoneId.of("UTC")).withZoneSameInstant(zona);
        ZonedDateTime fin = horaFinUtc.atZone(ZoneId.of("UTC")).withZoneSameInstant(zona);

        if (!fin.isAfter(inicio)) {
            throw new IllegalArgumentException("La hora de fin debe ser posterior a la hora de inicio");
        }

        double totalHoras = Duration.between(inicio, fin).toMinutes() / 60.0;

        if (esDominicalOFestivo) {
            return new DesgloseHoras(0, 0, 0, 0, redondear(totalHoras));
        }

        ZonedDateTime finOrdinaria = totalHoras > horasOrdinariasPorDia
                ? inicio.plusHours((long) horasOrdinariasPorDia).plusMinutes((long) ((horasOrdinariasPorDia % 1) * 60))
                : fin;

        // Use precise duration
        Duration dOrdinario = Duration.between(inicio, finOrdinaria);
        double horasOrdinarioTotal = dOrdinario.toMinutes() / 60.0;

        Duration dExtra = Duration.between(finOrdinaria, fin);
        double horasExtraTotal = dExtra.toMinutes() / 60.0;

        double nocturnoEnOrdinario = horasNocturnasEnIntervalo(inicio, finOrdinaria);
        double nocturnoEnExtra = horasNocturnasEnIntervalo(finOrdinaria, fin);

        double horasOrdinarias = horasOrdinarioTotal - nocturnoEnOrdinario;
        double horasExtraDiurnas = horasExtraTotal - nocturnoEnExtra;

        return new DesgloseHoras(
                redondear(horasOrdinarias),
                redondear(horasExtraDiurnas),
                redondear(nocturnoEnExtra),
                redondear(nocturnoEnOrdinario),
                0
        );
    }

    private double horasNocturnasEnIntervalo(ZonedDateTime start, ZonedDateTime end) {
        if (!end.isAfter(start)) return 0;
        String[] ini = inicioNocturno.split(":");
        int hIni = Integer.parseInt(ini[0]), mIni = Integer.parseInt(ini[1]);
        String[] fin = finNocturno.split(":");
        int hFin = Integer.parseInt(fin[0]), mFin = Integer.parseInt(fin[1]);

        double total = 0;
        ZonedDateTime cursor = start.minusDays(1).toLocalDate().atStartOfDay(zona);
        ZonedDateTime limite = end.toLocalDate().atStartOfDay(zona);

        while (!cursor.isAfter(limite)) {
            ZonedDateTime inicioFranja = cursor.withHour(hIni).withMinute(mIni).withSecond(0).withNano(0);
            ZonedDateTime finFranja = cursor.plusDays(1).withHour(hFin).withMinute(mFin).withSecond(0).withNano(0);

            ZonedDateTime overlapStart = start.isAfter(inicioFranja) ? start : inicioFranja;
            ZonedDateTime overlapEnd = end.isBefore(finFranja) ? end : finFranja;
            if (overlapEnd.isAfter(overlapStart)) {
                total += Duration.between(overlapStart, overlapEnd).toMinutes() / 60.0;
            }
            cursor = cursor.plusDays(1);
        }
        return total;
    }

    private double redondear(double h) {
        return Math.round(h * 100.0) / 100.0;
    }
}
