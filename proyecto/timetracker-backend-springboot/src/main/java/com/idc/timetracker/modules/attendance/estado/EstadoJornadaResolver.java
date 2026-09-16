package com.idc.timetracker.modules.attendance.estado;

import com.idc.timetracker.modules.attendance.EstadoJornada;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class EstadoJornadaResolver {

    private final Map<EstadoJornada, EstadoJornadaEstado> porTipo;

    public EstadoJornadaResolver(List<EstadoJornadaEstado> estados) {
        this.porTipo = estados.stream()
                .collect(Collectors.toMap(EstadoJornadaEstado::tipo, Function.identity()));
    }

    public EstadoJornadaEstado resolver(EstadoJornada estado) {
        EstadoJornadaEstado e = porTipo.get(estado);
        if (e == null) {
            throw new IllegalStateException("Sin implementación State para estado: " + estado);
        }
        return e;
    }
}
