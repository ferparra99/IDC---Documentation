package com.idc.timetracker.modules.calendar;

import com.idc.timetracker.common.config.AppProperties;
import com.idc.timetracker.common.exception.ValidacionException;
import com.idc.timetracker.common.util.TiempoUtil;
import com.idc.timetracker.modules.attendance.EstadoJornada;
import com.idc.timetracker.modules.attendance.RegistroJornada;
import com.idc.timetracker.modules.attendance.RegistroJornadaRepository;
import com.idc.timetracker.modules.calendar.dto.DiaCalendarioDTO;
import com.idc.timetracker.modules.holiday.FestivoRepository;
import com.idc.timetracker.modules.holiday.HolidaySyncService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CalendarServiceTest {

    private RegistroJornadaRepository registroRepo;
    private FestivoRepository festivoRepo;
    private HolidaySyncService holidaySyncService;
    private TiempoUtil tiempoUtil;
    private CalendarService service;

    private final UUID usuarioId = UUID.randomUUID();

    @BeforeEach
    void setup() {
        registroRepo = mock(RegistroJornadaRepository.class);
        festivoRepo = mock(FestivoRepository.class);
        holidaySyncService = mock(HolidaySyncService.class);
        AppProperties props = new AppProperties();
        props.setZonaHoraria("America/Bogota");
        tiempoUtil = new TiempoUtil(props);
        service = new CalendarService(registroRepo, festivoRepo, holidaySyncService, tiempoUtil);
    }

    @Test
    void obtenerMesValidaMes1a12() {
        assertThrows(ValidacionException.class, () -> service.obtenerMes(2026, 0, usuarioId));
        assertThrows(ValidacionException.class, () -> service.obtenerMes(2026, 13, usuarioId));
    }

    @Test
    void generaDiasConEsFinDeSemanaTrueParaSabadoDomingo() {
        when(registroRepo.findByUsuarioIdAndFechaBetweenOrderByFechaAsc(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(festivoRepo.findAll()).thenReturn(Collections.emptyList());

        // March 2026: 1 is Sunday, 7 is Saturday
        List<DiaCalendarioDTO> dias = service.obtenerMes(2026, 3, usuarioId);

        assertEquals(31, dias.size());
        // 2026-03-01 is Sunday -> weekend true
        DiaCalendarioDTO d1 = dias.get(0);
        assertEquals(LocalDate.of(2026, 3, 1), d1.fecha());
        assertTrue(d1.esFinDeSemana());
        // 2026-03-02 is Monday -> false
        assertFalse(dias.get(1).esFinDeSemana());
        // 2026-03-07 is Saturday -> true
        assertTrue(dias.get(6).esFinDeSemana());
        // 2026-03-08 is Sunday -> true
        assertTrue(dias.get(7).esFinDeSemana());
    }

    @Test
    void horasSumadasCorrectas() {
        RegistroJornada r = RegistroJornada.builder()
                .id(UUID.randomUUID())
                .fecha(LocalDate.of(2026, 3, 10))
                .estado(EstadoJornada.JORNADA_FINALIZADA)
                .horasOrdinarias(new BigDecimal("5.00"))
                .horasExtraDiurnas(new BigDecimal("1.50"))
                .horasExtraNocturnas(new BigDecimal("0.50"))
                .horasRecargoNocturno(new BigDecimal("0.25"))
                .horasDominicalFestivo(new BigDecimal("0.75"))
                .build();
        when(registroRepo.findByUsuarioIdAndFechaBetweenOrderByFechaAsc(any(), any(), any()))
                .thenReturn(List.of(r));
        when(festivoRepo.findAll()).thenReturn(Collections.emptyList());

        List<DiaCalendarioDTO> dias = service.obtenerMes(2026, 3, usuarioId);

        DiaCalendarioDTO d10 = dias.stream()
                .filter(d -> d.fecha().equals(LocalDate.of(2026, 3, 10)))
                .findFirst().orElseThrow();
        // 5 + 1.5 + 0.5 + 0.25 + 0.75 = 8.00
        assertEquals(0, new BigDecimal("8.00").compareTo(d10.horasTrabajadas()));
        assertEquals(r.getId(), d10.registroId());

        // dia sin registro -> 0
        DiaCalendarioDTO d11 = dias.stream()
                .filter(d -> d.fecha().equals(LocalDate.of(2026, 3, 11)))
                .findFirst().orElseThrow();
        assertEquals(0, BigDecimal.ZERO.compareTo(d11.horasTrabajadas()));
    }
}
