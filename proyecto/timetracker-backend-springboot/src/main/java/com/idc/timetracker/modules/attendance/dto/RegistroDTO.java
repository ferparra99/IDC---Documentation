package com.idc.timetracker.modules.attendance.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RegistroDTO {
    private UUID id;
    private String fecha; // YYYY-MM-DD
    private String estado; // SIN_INICIAR, JORNADA_ACTIVA, etc
    private boolean esFinDeSemana;
    private String horaInicio; // ISO en Bogotá
    private String horaInicio24; // HH:mm en Bogotá
    private String horaFin;
    private String horaFin24;
    private String descripcionProyectos;
    private BigDecimal horasOrdinarias;
    private BigDecimal horasExtraDiurnas;
    private BigDecimal horasExtraNocturnas;
    private BigDecimal horasRecargoNocturno;
    private BigDecimal horasDominicalFestivo;
    private boolean editadoManualmente;
}
