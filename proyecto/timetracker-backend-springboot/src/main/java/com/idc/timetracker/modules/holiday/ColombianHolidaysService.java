package com.idc.timetracker.modules.holiday;

import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class ColombianHolidaysService {

    public record FestivoCalculado(String fecha, String nombre) {}

    public List<FestivoCalculado> calcularParaAnio(int anio) {
        String pascua = calcularDomingoPascua(anio);

        List<FestivoCalculado> fijos = List.of(
                new FestivoCalculado(aYYYYMMDD(anio, 1, 1), "Año Nuevo"),
                new FestivoCalculado(aYYYYMMDD(anio, 5, 1), "Día del Trabajo"),
                new FestivoCalculado(aYYYYMMDD(anio, 7, 20), "Independencia de Colombia"),
                new FestivoCalculado(aYYYYMMDD(anio, 8, 7), "Batalla de Boyacá"),
                new FestivoCalculado(aYYYYMMDD(anio, 12, 8), "Inmaculada Concepción"),
                new FestivoCalculado(aYYYYMMDD(anio, 12, 25), "Navidad")
        );

        List<FestivoCalculado> trasladablesFijos = List.of(
                new FestivoCalculado(aYYYYMMDD(anio, 1, 6), "Reyes Magos"),
                new FestivoCalculado(aYYYYMMDD(anio, 3, 19), "San José"),
                new FestivoCalculado(aYYYYMMDD(anio, 6, 29), "San Pedro y San Pablo"),
                new FestivoCalculado(aYYYYMMDD(anio, 8, 15), "Asunción de la Virgen"),
                new FestivoCalculado(aYYYYMMDD(anio, 10, 12), "Día de la Raza"),
                new FestivoCalculado(aYYYYMMDD(anio, 11, 1), "Todos los Santos"),
                new FestivoCalculado(aYYYYMMDD(anio, 11, 11), "Independencia de Cartagena")
        ).stream().map(f -> new FestivoCalculado(trasladarASiguienteLunes(f.fecha()), f.nombre())).toList();

        List<FestivoCalculado> religiosos = List.of(
                new FestivoCalculado(sumarDias(pascua, -3), "Jueves Santo"),
                new FestivoCalculado(sumarDias(pascua, -2), "Viernes Santo")
        );

        List<FestivoCalculado> religiososMoviles = List.of(
                new FestivoCalculado(sumarDias(pascua, 43), "Ascensión del Señor"),
                new FestivoCalculado(sumarDias(pascua, 64), "Corpus Christi"),
                new FestivoCalculado(sumarDias(pascua, 71), "Sagrado Corazón de Jesús")
        ).stream().map(f -> new FestivoCalculado(trasladarASiguienteLunes(f.fecha()), f.nombre())).toList();

        List<FestivoCalculado> todos = new ArrayList<>();
        todos.addAll(fijos);
        todos.addAll(trasladablesFijos);
        todos.addAll(religiosos);
        todos.addAll(religiososMoviles);
        todos.sort(Comparator.comparing(FestivoCalculado::fecha));
        return todos;
    }

    private String calcularDomingoPascua(int anio) {
        int a = anio % 19;
        int b = anio / 100;
        int c = anio % 100;
        int d = b / 4;
        int e = b % 4;
        int f = (b + 8) / 25;
        int g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30;
        int i = c / 4;
        int k = c % 4;
        int l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451;
        int mes = (h + l - 7 * m + 114) / 31;
        int dia = ((h + l - 7 * m + 114) % 31) + 1;
        return aYYYYMMDD(anio, mes, dia);
    }

    private String trasladarASiguienteLunes(String fecha) {
        int dow = diaDeLaSemanaISO(fecha);
        if (dow == 1) return fecha;
        return sumarDias(fecha, 8 - dow);
    }

    private int diaDeLaSemanaISO(String fecha) {
        LocalDate d = LocalDate.parse(fecha);
        DayOfWeek dow = d.getDayOfWeek();
        return dow.getValue();
    }

    private String sumarDias(String fecha, int dias) {
        return LocalDate.parse(fecha).plusDays(dias).format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

    private String aYYYYMMDD(int anio, int mes, int dia) {
        return String.format("%04d-%02d-%02d", anio, mes, dia);
    }
}
