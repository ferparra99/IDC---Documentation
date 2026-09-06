package com.idc.timetracker.common.util;

import com.idc.timetracker.common.config.AppProperties;
import org.springframework.stereotype.Component;

import java.time.*;
import java.time.format.DateTimeFormatter;

/**
 * Replica src/shared/utils/tiempo.ts del backend Node.
 * Hora siempre del servidor, zona America/Bogota, formato 24h.
 */
@Component
public class TiempoUtil {

    private final ZoneId zona;

    public TiempoUtil(AppProperties props) {
        this.zona = ZoneId.of(props.getZonaHoraria());
    }

    public ZoneId getZona() { return zona; }

    public LocalDate fechaBogotaHoy() {
        return LocalDate.now(zona);
    }

    public LocalDate fechaBogotaDe(Instant instant) {
        return instant.atZone(zona).toLocalDate();
    }

    public String horaBogota24(Instant instant) {
        if (instant == null) return null;
        return instant.atZone(zona).format(DateTimeFormatter.ofPattern("HH:mm"));
    }

    public boolean esFinDeSemana(LocalDate fecha) {
        DayOfWeek dow = fecha.getDayOfWeek();
        return dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY;
    }

    public boolean esFinDeSemanaBogota(Instant instant) {
        return esFinDeSemana(fechaBogotaDe(instant));
    }

    public Instant ahora() {
        return Instant.now();
    }
}
