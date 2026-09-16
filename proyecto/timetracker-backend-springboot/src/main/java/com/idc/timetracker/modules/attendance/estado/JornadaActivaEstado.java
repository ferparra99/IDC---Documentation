package com.idc.timetracker.modules.attendance.estado;

import com.idc.timetracker.modules.attendance.EstadoJornada;
import org.springframework.stereotype.Component;

/**
 * Estado JORNADA_ACTIVA.
 * Regla preservada: sin cierre automático — permanece activa indefinidamente
 * hasta una llamada explícita a finalizarJornada (no hay expiración/job).
 */
@Component
public class JornadaActivaEstado implements EstadoJornadaEstado {

    @Override
    public EstadoJornada tipo() {
        return EstadoJornada.JORNADA_ACTIVA;
    }

    @Override
    public void validarInicio() {
        throw new com.idc.timetracker.common.exception.JornadaYaActivaException("Ya existe una jornada activa para hoy");
    }

    @Override
    public void validarFinalizacion() {
        // transición válida: JORNADA_ACTIVA -> JORNADA_FINALIZADA
    }

    // validarEdicionManual hereda el default que lanza excepción
}
