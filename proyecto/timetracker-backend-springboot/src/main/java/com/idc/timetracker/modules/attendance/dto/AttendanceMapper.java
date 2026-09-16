package com.idc.timetracker.modules.attendance.dto;

import com.idc.timetracker.common.util.TiempoUtil;
import com.idc.timetracker.modules.attendance.RegistroJornada;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Component
@RequiredArgsConstructor
public class AttendanceMapper {

    private final TiempoUtil tiempoUtil;

    public RegistroDTO toDTO(RegistroJornada r) {
        if (r == null) return null;
        return RegistroDTO.builder()
                .id(r.getId())
                .fecha(r.getFecha() != null ? r.getFecha().toString() : null)
                .estado(r.getEstado() != null ? r.getEstado().name() : null)
                .esFinDeSemana(r.getFecha() != null && tiempoUtil.esFinDeSemana(r.getFecha()))
                .horaInicio(toIsoBogota(r.getHoraInicio()))
                .horaInicio24(tiempoUtil.horaBogota24(r.getHoraInicio()))
                .horaFin(toIsoBogota(r.getHoraFin()))
                .horaFin24(tiempoUtil.horaBogota24(r.getHoraFin()))
                .descripcionProyectos(r.getDescripcionProyectos())
                .horasOrdinarias(r.getHorasOrdinarias())
                .horasExtraDiurnas(r.getHorasExtraDiurnas())
                .horasExtraNocturnas(r.getHorasExtraNocturnas())
                .horasRecargoNocturno(r.getHorasRecargoNocturno())
                .horasDominicalFestivo(r.getHorasDominicalFestivo())
                .editadoManualmente(r.isEditadoManualmente())
                .build();
    }

    private String toIsoBogota(Instant instant) {
        if (instant == null) return null;
        // ISO con zona Bogotá sin milisegundos similar a tiempo.ts isoBogota
        ZoneId zona = tiempoUtil.getZona();
        return instant.atZone(ZoneId.of("UTC")).withZoneSameInstant(zona)
                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }
}
