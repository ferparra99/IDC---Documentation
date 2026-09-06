package com.idc.timetracker.modules.attendance;

public record DesgloseHoras(
        double horasOrdinarias,
        double horasExtraDiurnas,
        double horasExtraNocturnas,
        double horasRecargoNocturno,
        double horasDominicalFestivo
) {}
