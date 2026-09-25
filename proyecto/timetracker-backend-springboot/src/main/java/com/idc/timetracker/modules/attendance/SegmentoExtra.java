package com.idc.timetracker.modules.attendance;

import java.time.ZonedDateTime;

/**
 * Segmento de hora extra clasificado con su intervalo exacto.
 */
public record SegmentoExtra(
        ZonedDateTime inicio,
        ZonedDateTime fin,
        double cantidadHoras,
        String tipo // "Extra Diurna", "Extra Nocturna", "Dominical/Festivo"
) {}
