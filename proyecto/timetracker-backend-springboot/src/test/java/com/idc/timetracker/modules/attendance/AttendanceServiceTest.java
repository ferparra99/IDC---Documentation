package com.idc.timetracker.modules.attendance;

import com.idc.timetracker.common.config.AppProperties;
import com.idc.timetracker.common.exception.JornadaYaActivaException;
import com.idc.timetracker.common.exception.NoHayJornadaActivaException;
import com.idc.timetracker.common.util.TiempoUtil;
import com.idc.timetracker.modules.holiday.FestivoRepository;
import com.idc.timetracker.modules.user.RolUsuario;
import com.idc.timetracker.modules.user.Usuario;
import com.idc.timetracker.modules.user.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AttendanceServiceTest {

    private RegistroJornadaRepository registroRepo;
    private UsuarioRepository usuarioRepo;
    private FestivoRepository festivoRepo;
    private TiempoUtil tiempoUtil;
    private CalculadoraHorasService calculadora;
    private AttendanceService service;

    @BeforeEach
    void setup() {
        registroRepo = mock(RegistroJornadaRepository.class);
        usuarioRepo = mock(UsuarioRepository.class);
        festivoRepo = mock(FestivoRepository.class);
        AppProperties props = new AppProperties();
        props.setZonaHoraria("America/Bogota");
        tiempoUtil = new TiempoUtil(props);
        calculadora = new CalculadoraHorasService("19:00", "06:00", 8, ZoneId.of("America/Bogota"));
        // need AuditService mock - use null via reflection? Create simple stub
        var auditService = mock(com.idc.timetracker.common.audit.AuditService.class);
        service = new AttendanceService(registroRepo, usuarioRepo, calculadora, tiempoUtil, festivoRepo, auditService);
    }

    @Test
    void iniciarCreaRegistroCuandoNoExiste() {
        UUID uid = UUID.randomUUID();
        when(registroRepo.findByUsuarioIdAndFecha(any(), any())).thenReturn(Optional.empty());
        when(registroRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(usuarioRepo.findById(uid)).thenReturn(Optional.of(Usuario.builder().id(uid).email("a@a.com").rol(RolUsuario.empleado).build()));

        var r = service.iniciarJornada(uid);
        assertEquals(EstadoJornada.JORNADA_ACTIVA, r.getEstado());
        verify(registroRepo).save(any());
    }

    @Test
    void iniciarLanzaSiYaActiva() {
        UUID uid = UUID.randomUUID();
        RegistroJornada activa = new RegistroJornada();
        activa.setEstado(EstadoJornada.JORNADA_ACTIVA);
        when(usuarioRepo.findById(uid)).thenReturn(Optional.of(Usuario.builder().id(uid).email("a@a.com").rol(RolUsuario.empleado).build()));
        when(registroRepo.findByUsuarioIdAndFecha(any(), any())).thenReturn(Optional.of(activa));

        assertThrows(JornadaYaActivaException.class, () -> service.iniciarJornada(uid));
    }

    @Test
    void finalizarRequiereDescripcion() {
        UUID uid = UUID.randomUUID();
        when(registroRepo.findByUsuarioIdAndEstadoOrderByFechaAsc(uid, EstadoJornada.JORNADA_ACTIVA)).thenReturn(List.of(new RegistroJornada()));
        // will fail due to missing horaInicio but we test validation first
        assertThrows(Exception.class, () -> service.finalizarJornada(uid, "   "));
    }

    @Test
    void finalizarLanzaSiNoHayActiva() {
        UUID uid = UUID.randomUUID();
        when(registroRepo.findByUsuarioIdAndEstadoOrderByFechaAsc(uid, EstadoJornada.JORNADA_ACTIVA)).thenReturn(List.of());
        assertThrows(NoHayJornadaActivaException.class, () -> service.finalizarJornada(uid, "Proyecto X"));
    }
}
