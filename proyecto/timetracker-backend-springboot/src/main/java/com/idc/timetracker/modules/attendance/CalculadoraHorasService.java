package com.idc.timetracker.modules.attendance;

import com.idc.timetracker.common.config.AppProperties;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Horario laboral fijo: 08:00-17:30 menos 1h almuerzo 12:00-13:00 = 8h.
 * Extra = fuera de 08:00-12:00 y 13:00-17:30. Nocturna 19:00-06:00 (Colombia).
 * Replica lógica pero anclada a ventana fija para reporte.
 */
@Service
public class CalculadoraHorasService {

    private final ZoneId zona;
    private final String inicioNocturno;
    private final String finNocturno;
    private final double horasOrdinariasPorDia;

    // ventana fija
    private static final LocalTime INICIO_LABORAL = LocalTime.of(8, 0);
    private static final LocalTime FIN_LABORAL = LocalTime.of(17, 30);
    private static final LocalTime ALMUERZO_INI = LocalTime.of(12, 0);
    private static final LocalTime ALMUERZO_FIN = LocalTime.of(13, 0);
    private static final LocalTime DIURNA_FIN = LocalTime.of(19, 0);
    private static final LocalTime NOCTURNA_INI = LocalTime.of(19, 0);
    private static final LocalTime NOCTURNA_FIN = LocalTime.of(6, 0);

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

    /**
     * Segmenta las horas extra con su intervalo exacto para el reporte.
     * - Dominical: un único segmento con todo el intervalo.
     * - Normal: tramos fuera de 08-12 y 13-17:30, partidos por 19:00/06:00.
     */
    public List<SegmentoExtra> calcularSegmentosExtra(Instant horaInicioUtc, Instant horaFinUtc, boolean esDominicalOFestivo) {
        ZonedDateTime inicio = horaInicioUtc.atZone(ZoneId.of("UTC")).withZoneSameInstant(zona);
        ZonedDateTime fin = horaFinUtc.atZone(ZoneId.of("UTC")).withZoneSameInstant(zona);
        if (!fin.isAfter(inicio)) throw new IllegalArgumentException("La hora de fin debe ser posterior a la hora de inicio");

        if (esDominicalOFestivo) {
            double total = Duration.between(inicio, fin).toMinutes() / 60.0;
            total -= horasAlmuerzoEnIntervalo(inicio, fin);
            if (total < 0) total = 0;
            return List.of(new SegmentoExtra(inicio, fin, redondear(total), "Dominical/Festivo"));
        }

        List<SegmentoExtra> result = new java.util.ArrayList<>();
        // iterar día por día para manejar cruces de medianoche
        ZonedDateTime cursor = inicio;
        while (cursor.isBefore(fin)) {
            LocalDate curDate = cursor.toLocalDate();
            ZonedDateTime dayStart = curDate.atStartOfDay(zona);
            ZonedDateTime dayEnd = curDate.plusDays(1).atStartOfDay(zona);
            ZonedDateTime segStart = cursor.isAfter(dayStart) ? cursor : dayStart;
            ZonedDateTime segEnd = fin.isBefore(dayEnd) ? fin : dayEnd;
            if (!segEnd.isAfter(segStart)) break;

            // tramos fuera de horario laboral en este día
            List<Interval> fueras = tramosFueraHorario(curDate, segStart, segEnd);
            for (Interval iv : fueras) {
                // partir por franja nocturna
                double nocturno = horasNocturnasEnIntervalo(iv.start, iv.end);
                double totalIv = Duration.between(iv.start, iv.end).toMinutes() / 60.0;
                double diurno = totalIv - nocturno;
                if (diurno > 0.005) {
                    // si el intervalo tiene parte diurna y nocturna, hay que dividir el intervalo físico
                    // para reporte necesitamos inicio/fin exactos por tipo
                    // generar sub-intervalos divididos por 19:00 y 06:00
                    List<Interval> diurnos = extraerDiurnos(iv.start, iv.end);
                    for (Interval d : diurnos) {
                        double c = Duration.between(d.start, d.end).toMinutes() / 60.0;
                        if (c > 0.005) result.add(new SegmentoExtra(d.start, d.end, redondear(c), "Extra Diurna"));
                    }
                    List<Interval> nocts = extraerNocturnos(iv.start, iv.end);
                    for (Interval n : nocts) {
                        double c = Duration.between(n.start, n.end).toMinutes() / 60.0;
                        if (c > 0.005) result.add(new SegmentoExtra(n.start, n.end, redondear(c), "Extra Nocturna"));
                    }
                } else {
                    // todo nocturno
                    double c = totalIv;
                    if (c > 0.005) result.add(new SegmentoExtra(iv.start, iv.end, redondear(c), "Extra Nocturna"));
                }
            }
            cursor = segEnd;
        }
        // ordenar por inicio
        result.sort(java.util.Comparator.comparing(SegmentoExtra::inicio));
        return result;
    }

    private record Interval(ZonedDateTime start, ZonedDateTime end) {}

    private List<Interval> tramosFueraHorario(LocalDate date, ZonedDateTime segStart, ZonedDateTime segEnd) {
        List<Interval> res = new java.util.ArrayList<>();
        ZonedDateTime iniLab1 = date.atTime(INICIO_LABORAL).atZone(zona);
        ZonedDateTime finLab1 = date.atTime(ALMUERZO_INI).atZone(zona);
        ZonedDateTime iniLab2 = date.atTime(ALMUERZO_FIN).atZone(zona);
        ZonedDateTime finLab2 = date.atTime(FIN_LABORAL).atZone(zona);

        // intervalos extra: [00:00, 08:00) y [17:30, 24:00)
        // almuerzo 12-13 NO es extra ni laboral (descanso)
        addIfOverlap(res, segStart, segEnd, date.atStartOfDay(zona), iniLab1);
        addIfOverlap(res, segStart, segEnd, finLab2, date.plusDays(1).atStartOfDay(zona));
        return res;
    }

    private void addIfOverlap(List<Interval> out, ZonedDateTime s, ZonedDateTime e, ZonedDateTime a, ZonedDateTime b) {
        ZonedDateTime oS = s.isAfter(a) ? s : a;
        ZonedDateTime oE = e.isBefore(b) ? e : b;
        if (oE.isAfter(oS)) out.add(new Interval(oS, oE));
    }

    private List<Interval> extraerDiurnos(ZonedDateTime s, ZonedDateTime e) {
        List<Interval> res = new java.util.ArrayList<>();
        // diurna = fuera de 19:00-06:00
        ZonedDateTime cur = s;
        while (cur.isBefore(e)) {
            ZonedDateTime nextMidnight = cur.toLocalDate().plusDays(1).atStartOfDay(zona);
            ZonedDateTime windowEnd = e.isBefore(nextMidnight) ? e : nextMidnight;
            // en este día, noche es 00-06 y 19-24
            ZonedDateTime n1S = cur.toLocalDate().atStartOfDay(zona);
            ZonedDateTime n1E = cur.toLocalDate().atTime(6, 0).atZone(zona);
            ZonedDateTime n2S = cur.toLocalDate().atTime(19, 0).atZone(zona);
            ZonedDateTime n2E = cur.toLocalDate().plusDays(1).atStartOfDay(zona);
            // diurna = cur-windowEnd minus n1 and n2
            List<Interval> nocts = new java.util.ArrayList<>();
            addIfOverlap(nocts, cur, windowEnd, n1S, n1E);
            addIfOverlap(nocts, cur, windowEnd, n2S, n2E);
            // construir diurna por complemento
            ZonedDateTime p = cur;
            nocts.sort(java.util.Comparator.comparing(Interval::start));
            for (Interval n : nocts) {
                if (n.start.isAfter(p)) res.add(new Interval(p, n.start.isBefore(windowEnd) ? n.start : windowEnd));
                if (n.end.isAfter(p)) p = n.end.isBefore(windowEnd) ? n.end : windowEnd;
                if (!p.isBefore(windowEnd)) break;
            }
            if (p.isBefore(windowEnd)) res.add(new Interval(p, windowEnd));
            cur = windowEnd;
        }
        return res;
    }

    private List<Interval> extraerNocturnos(ZonedDateTime s, ZonedDateTime e) {
        List<Interval> res = new java.util.ArrayList<>();
        ZonedDateTime cur = s;
        while (cur.isBefore(e)) {
            ZonedDateTime nextMidnight = cur.toLocalDate().plusDays(1).atStartOfDay(zona);
            ZonedDateTime windowEnd = e.isBefore(nextMidnight) ? e : nextMidnight;
            ZonedDateTime n1S = cur.toLocalDate().atStartOfDay(zona);
            ZonedDateTime n1E = cur.toLocalDate().atTime(6, 0).atZone(zona);
            ZonedDateTime n2S = cur.toLocalDate().atTime(19, 0).atZone(zona);
            ZonedDateTime n2E = cur.toLocalDate().plusDays(1).atStartOfDay(zona);
            addIfOverlap(res, cur, windowEnd, n1S, n1E);
            addIfOverlap(res, cur, windowEnd, n2S, n2E);
            cur = windowEnd;
        }
        res.sort(java.util.Comparator.comparing(Interval::start));
        return res;
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

    private double horasLaboralesEnIntervalo(ZonedDateTime start, ZonedDateTime end) {
        if (!end.isAfter(start)) return 0;
        double total = 0;
        ZonedDateTime cur = start.toLocalDate().atStartOfDay(zona);
        ZonedDateTime limite = end.toLocalDate().atStartOfDay(zona);
        while (!cur.isAfter(limite)) {
            LocalDate d = cur.toLocalDate();
            ZonedDateTime lab1S = d.atTime(INICIO_LABORAL).atZone(zona);
            ZonedDateTime lab1E = d.atTime(ALMUERZO_INI).atZone(zona);
            ZonedDateTime lab2S = d.atTime(ALMUERZO_FIN).atZone(zona);
            ZonedDateTime lab2E = d.atTime(FIN_LABORAL).atZone(zona);
            ZonedDateTime oS1 = start.isAfter(lab1S) ? start : lab1S;
            ZonedDateTime oE1 = end.isBefore(lab1E) ? end : lab1E;
            if (oE1.isAfter(oS1)) total += Duration.between(oS1, oE1).toMinutes() / 60.0;
            ZonedDateTime oS2 = start.isAfter(lab2S) ? start : lab2S;
            ZonedDateTime oE2 = end.isBefore(lab2E) ? end : lab2E;
            if (oE2.isAfter(oS2)) total += Duration.between(oS2, oE2).toMinutes() / 60.0;
            cur = cur.plusDays(1);
        }
        return total;
    }

    private double horasAlmuerzoEnIntervalo(ZonedDateTime start, ZonedDateTime end) {
        if (!end.isAfter(start)) return 0;
        double total = 0;
        ZonedDateTime cur = start.toLocalDate().atStartOfDay(zona);
        ZonedDateTime limite = end.toLocalDate().atStartOfDay(zona);
        while (!cur.isAfter(limite)) {
            LocalDate d = cur.toLocalDate();
            ZonedDateTime almS = d.atTime(ALMUERZO_INI).atZone(zona);
            ZonedDateTime almE = d.atTime(ALMUERZO_FIN).atZone(zona);
            ZonedDateTime oS = start.isAfter(almS) ? start : almS;
            ZonedDateTime oE = end.isBefore(almE) ? end : almE;
            if (oE.isAfter(oS)) total += Duration.between(oS, oE).toMinutes() / 60.0;
            cur = cur.plusDays(1);
        }
        return total;
    }

    private double redondear(double h) {
        return Math.round(h * 100.0) / 100.0;
    }
}
