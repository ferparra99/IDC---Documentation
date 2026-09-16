package com.idc.timetracker.modules.attendance.estado;

import com.idc.timetracker.modules.attendance.EstadoJornada;
import org.springframework.stereotype.Component;

/**
 * Estado EN_PERMISO — reservado para integración futura con modules/leave.
 * Hoy ningún flujo asigna este estado; se modela por completitud del enum
 * y bloquea inicio/fin/edición (defaults) hasta que exista flujo real.
 */
@Component
public class EnPermisoEstado implements EstadoJornadaEstado {

    @Override
    public EstadoJornada tipo() {
        return EstadoJornada.EN_PERMISO;
    }
}
