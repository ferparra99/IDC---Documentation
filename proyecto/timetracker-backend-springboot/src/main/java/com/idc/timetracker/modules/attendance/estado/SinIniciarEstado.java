package com.idc.timetracker.modules.attendance.estado;

import com.idc.timetracker.modules.attendance.EstadoJornada;
import org.springframework.stereotype.Component;

@Component
public class SinIniciarEstado implements EstadoJornadaEstado {

    @Override
    public EstadoJornada tipo() {
        return EstadoJornada.SIN_INICIAR;
    }

    @Override
    public void validarInicio() {
        // transición válida: SIN_INICIAR -> JORNADA_ACTIVA, no lanza
    }
}
