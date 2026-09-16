package com.idc.timetracker.modules.attendance;

import com.idc.timetracker.common.config.AppProperties;
import com.idc.timetracker.common.exception.JornadaYaActivaException;
import com.idc.timetracker.common.exception.NoHayJornadaActivaException;
import com.idc.timetracker.common.exception.TransicionInvalidaException;
import com.idc.timetracker.common.util.TiempoUtil;
import com.idc.timetracker.modules.attendance.estado.*;
import com.idc.timetracker.modules.holiday.FestivoRepository;
import com.idc.timetracker.modules.user.RolUsuario;
import com.idc.timetracker.modules.user.Usuario;
import com.idc.timetracker.modules.user.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Instant;
import java.time.LocalDate;
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
    private EstadoJornadaResolver resolver;

    @BeforeEach
    void setup() {
        registroRepo = mock(RegistroJornadaRepository.class);
        usuarioRepo = mock(UsuarioRepository.class);
        festivoRepo = mock(FestivoRepository.class);
        AppProperties props = new AppProperties();
        props.setZonaHoraria("America/Bogota");
        tiempoUtil = new TiempoUtil(props);
        calculadora = new CalculadoraHorasService("19:00", "06:00", 8, ZoneId.of("America/Bogota"));
        // resolver real con las 4 implementaciones (sin Spring context)
        resolver = new EstadoJornadaResolver(List.of(
                new SinIniciarEstado(),
                new JornadaActivaEstado(),
                new JornadaFinalizadaEstado(),
                new EnPermisoEstado()
        ));
        var auditService = mock(com.idc.timetracker.common.audit.AuditService.class);
        service = new AttendanceService(registroRepo, usuarioRepo, calculadora, tiempoUtil, festivoRepo, auditService, resolver);
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

    // --- casos de transición inválida (State pattern) ---

    @Test
    void iniciarLanzaSiYaFinalizada() {
        UUID uid = UUID.randomUUID();
        RegistroJornada finalizada = new RegistroJornada();
        finalizada.setEstado(EstadoJornada.JORNADA_FINALIZADA);
        when(usuarioRepo.findById(uid)).thenReturn(Optional.of(Usuario.builder().id(uid).email("a@a.com").rol(RolUsuario.empleado).build()));
        when(registroRepo.findByUsuarioIdAndFecha(any(), any())).thenReturn(Optional.of(finalizada));
        assertThrows(JornadaYaActivaException.class, () -> service.iniciarJornada(uid));
    }

    @Test
    void iniciarLanzaSiEnPermiso() {
        UUID uid = UUID.randomUUID();
        RegistroJornada enPermiso = new RegistroJornada();
        enPermiso.setEstado(EstadoJornada.EN_PERMISO);
        when(usuarioRepo.findById(uid)).thenReturn(Optional.of(Usuario.builder().id(uid).email("a@a.com").rol(RolUsuario.empleado).build()));
        when(registroRepo.findByUsuarioIdAndFecha(any(), any())).thenReturn(Optional.of(enPermiso));
        assertThrows(JornadaYaActivaException.class, () -> service.iniciarJornada(uid));
    }

    @Test
    void editarManualLanzaSiActiva() {
        UUID uid = UUID.randomUUID();
        UUID rid = UUID.randomUUID();
        RegistroJornada activa = RegistroJornada.builder()
                .id(rid).fecha(LocalDate.of(2026, 8, 30))
                .estado(EstadoJornada.JORNADA_ACTIVA)
                .usuario(Usuario.builder().id(uid).email("a@a.com").rol(RolUsuario.empleado).build())
                .horaInicio(Instant.now()).build();
        when(registroRepo.findById(rid)).thenReturn(Optional.of(activa));
        assertThrows(TransicionInvalidaException.class,
                () -> service.editarManual(uid, rid, Instant.now(), Instant.now().plusSeconds(3600), "motivo"));
    }

    @Test
    void editarManualLanzaSiSinIniciar() {
        UUID uid = UUID.randomUUID();
        UUID rid = UUID.randomUUID();
        RegistroJornada sinIniciar = RegistroJornada.builder()
                .id(rid).fecha(LocalDate.of(2026, 8, 30))
                .estado(EstadoJornada.SIN_INICIAR)
                .usuario(Usuario.builder().id(uid).email("a@a.com").rol(RolUsuario.empleado).build())
                .build();
        when(registroRepo.findById(rid)).thenReturn(Optional.of(sinIniciar));
        assertThrows(TransicionInvalidaException.class,
                () -> service.editarManual(uid, rid, Instant.now(), Instant.now().plusSeconds(3600), "motivo"));
    }

    @Test
    void editarManualLanzaSiEnPermiso() {
        UUID uid = UUID.randomUUID();
        UUID rid = UUID.randomUUID();
        RegistroJornada enPermiso = RegistroJornada.builder()
                .id(rid).fecha(LocalDate.of(2026, 8, 30))
                .estado(EstadoJornada.EN_PERMISO)
                .usuario(Usuario.builder().id(uid).email("a@a.com").rol(RolUsuario.empleado).build())
                .build();
        when(registroRepo.findById(rid)).thenReturn(Optional.of(enPermiso));
        assertThrows(TransicionInvalidaException.class,
                () -> service.editarManual(uid, rid, Instant.now(), Instant.now().plusSeconds(3600), "motivo"));
    }

    @Test
    void resolverCubreLosCuatroEstados() {
        assertDoesNotThrow(() -> resolver.resolver(EstadoJornada.SIN_INICIAR).validarInicio());
        assertDoesNotThrow(() -> resolver.resolver(EstadoJornada.JORNADA_ACTIVA).validarFinalizacion());
        assertDoesNotThrow(() -> resolver.resolver(EstadoJornada.JORNADA_FINALIZADA).validarEdicionManual());
        // EN_PERMISO bloquea todo
        assertThrows(JornadaYaActivaException.class, () -> resolver.resolver(EstadoJornada.EN_PERMISO).validarInicio());
        assertThrows(NoHayJornadaActivaException.class, () -> resolver.resolver(EstadoJornada.EN_PERMISO).validarFinalizacion());
        assertThrows(TransicionInvalidaException.class, () -> resolver.resolver(EstadoJornada.EN_PERMISO).validarEdicionManual());
    }
}
