package com.idc.timetracker.modules.calendar.dto;

import com.idc.timetracker.modules.attendance.EstadoJornada;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record DiaCalendarioDTO(
        LocalDate fecha,
        boolean esFinDeSemana,
        boolean esFestivo,
        String nombreFestivo,
        BigDecimal horasTrabajadas,
        UUID registroId,
        EstadoJornada estado
) {}
