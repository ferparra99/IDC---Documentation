package com.idc.timetracker.modules.calendar;

import com.idc.timetracker.common.exception.ValidacionException;
import com.idc.timetracker.common.util.TiempoUtil;
import com.idc.timetracker.modules.attendance.RegistroJornada;
import com.idc.timetracker.modules.attendance.RegistroJornadaRepository;
import com.idc.timetracker.modules.calendar.dto.DiaCalendarioDTO;
import com.idc.timetracker.modules.holiday.Festivo;
import com.idc.timetracker.modules.holiday.FestivoRepository;
import com.idc.timetracker.modules.holiday.HolidaySyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CalendarService {

    private final RegistroJornadaRepository registroRepo;
    private final FestivoRepository festivoRepo;
    private final HolidaySyncService holidaySyncService;
    private final TiempoUtil tiempoUtil;

    @Transactional(readOnly = true)
    public List<DiaCalendarioDTO> obtenerMes(int anio, int mes, UUID usuarioId) {
        if (mes < 1 || mes > 12) {
            throw new ValidacionException("Mes debe estar entre 1 y 12");
        }
        if (anio < 1970 || anio > 2100) {
            throw new ValidacionException("Año fuera de rango");
        }
        holidaySyncService.ensureSync(anio);

        YearMonth ym = YearMonth.of(anio, mes);
        LocalDate inicio = ym.atDay(1);
        LocalDate fin = ym.atEndOfMonth();

        List<RegistroJornada> registros = registroRepo.findByUsuarioIdAndFechaBetweenOrderByFechaAsc(usuarioId, inicio, fin);
        Map<LocalDate, RegistroJornada> registroMap = registros.stream()
                .collect(Collectors.toMap(RegistroJornada::getFecha, r -> r, (a, b) -> a));

        List<Festivo> festivos = festivoRepo.findAll().stream()
                .filter(f -> !f.getFecha().isBefore(inicio) && !f.getFecha().isAfter(fin))
                .toList();
        Map<LocalDate, Festivo> festivoMap = festivos.stream()
                .collect(Collectors.toMap(Festivo::getFecha, f -> f, (a, b) -> a));

        List<DiaCalendarioDTO> dias = new ArrayList<>();
        for (int d = 1; d <= ym.lengthOfMonth(); d++) {
            LocalDate fecha = LocalDate.of(anio, mes, d);
            boolean esFinDeSemana = tiempoUtil.esFinDeSemana(fecha);
            Festivo fest = festivoMap.get(fecha);
            boolean esFestivo = fest != null;
            String nombreFestivo = esFestivo ? fest.getNombre() : null;
            RegistroJornada r = registroMap.get(fecha);
            BigDecimal horas = BigDecimal.ZERO;
            UUID registroId = null;
            var estado = (com.idc.timetracker.modules.attendance.EstadoJornada) null;
            if (r != null) {
                horas = sumHoras(r);
                registroId = r.getId();
                estado = r.getEstado();
            }
            dias.add(new DiaCalendarioDTO(fecha, esFinDeSemana, esFestivo, nombreFestivo, horas, registroId, estado));
        }
        return dias;
    }

    private BigDecimal sumHoras(RegistroJornada r) {
        BigDecimal total = BigDecimal.ZERO;
        if (r.getHorasOrdinarias() != null) total = total.add(r.getHorasOrdinarias());
        if (r.getHorasExtraDiurnas() != null) total = total.add(r.getHorasExtraDiurnas());
        if (r.getHorasExtraNocturnas() != null) total = total.add(r.getHorasExtraNocturnas());
        if (r.getHorasRecargoNocturno() != null) total = total.add(r.getHorasRecargoNocturno());
        if (r.getHorasDominicalFestivo() != null) total = total.add(r.getHorasDominicalFestivo());
        return total.setScale(2, RoundingMode.HALF_UP);
    }
}
