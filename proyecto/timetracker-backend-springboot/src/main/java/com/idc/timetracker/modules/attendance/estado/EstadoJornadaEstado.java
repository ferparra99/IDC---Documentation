package com.idc.timetracker.modules.attendance.estado;

import com.idc.timetracker.common.exception.JornadaYaActivaException;
import com.idc.timetracker.common.exception.NoHayJornadaActivaException;
import com.idc.timetracker.common.exception.TransicionInvalidaException;
import com.idc.timetracker.modules.attendance.EstadoJornada;

/**
 * Interfaz del patrón State para el ciclo de vida de jornada.
 * Cada implementación conoce solo sus transiciones válidas (SRP/OCP).
 * Los mensajes de excepción se copian literalmente de AttendanceService
 * para no romper contratos HTTP ni tests existentes.
 */
public interface EstadoJornadaEstado {

    EstadoJornada tipo();

    default void validarInicio() {
        throw new JornadaYaActivaException("Ya existe una jornada para hoy con estado " + tipo());
    }

    default void validarFinalizacion() {
        throw new NoHayJornadaActivaException("No hay jornada activa para finalizar");
    }

    default void validarEdicionManual() {
        throw new TransicionInvalidaException(
                "Solo se pueden editar manualmente jornadas ya finalizadas (estado actual: " + tipo() + ")");
    }
}
