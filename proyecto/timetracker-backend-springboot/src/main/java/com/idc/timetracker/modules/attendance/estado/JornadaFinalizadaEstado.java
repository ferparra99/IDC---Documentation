package com.idc.timetracker.modules.attendance.estado;

import com.idc.timetracker.modules.attendance.EstadoJornada;
import org.springframework.stereotype.Component;

@Component
public class JornadaFinalizadaEstado implements EstadoJornadaEstado {

    @Override
    public EstadoJornada tipo() {
        return EstadoJornada.JORNADA_FINALIZADA;
    }

    @Override
    public void validarInicio() {
        // ya existe jornada para hoy con estado JORNADA_FINALIZADA -> usa default
        // Se delega al default que lanza con mensaje "Ya existe una jornada para hoy con estado JORNADA_FINALIZADA"
        EstadoJornadaEstado.super.validarInicio();
    }

    @Override
    public void validarEdicionManual() {
        // permitido: solo finalizadas se pueden editar
    }

    // validarFinalizacion hereda default (no hay activa que finalizar)
}
