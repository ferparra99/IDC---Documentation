package com.idc.timetracker.modules.leave;

import com.idc.timetracker.common.exception.ValidacionException;
import com.idc.timetracker.modules.attendance.RegistroJornada;
import com.idc.timetracker.modules.attendance.RegistroJornadaRepository;
import com.idc.timetracker.modules.systemconfig.SystemConfigService;
import com.idc.timetracker.modules.user.Usuario;
import com.idc.timetracker.modules.user.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PermisoServiceTest {

    private PermisoRepository permisoRepo;
    private UsuarioRepository usuarioRepo;
    private RegistroJornadaRepository jornadaRepo;
    private SystemConfigService configService;
    private PermisoService service;

    private final UUID usuarioId = UUID.randomUUID();
    private final LocalDate fecha = LocalDate.of(2026, 5, 10);

    @BeforeEach
    void setup() {
        permisoRepo = mock(PermisoRepository.class);
        usuarioRepo = mock(UsuarioRepository.class);
        jornadaRepo = mock(RegistroJornadaRepository.class);
        configService = mock(SystemConfigService.class);
        service = new PermisoService(permisoRepo, usuarioRepo, jornadaRepo, configService);
    }

    private Usuario usuario() {
        return Usuario.builder().id(usuarioId).email("test@test.com").nombre("Test").build();
    }

    private RegistroJornada jornadaConHoras(BigDecimal totalOrdinarias) {
        return RegistroJornada.builder()
                .horasOrdinarias(totalOrdinarias)
                .horasExtraDiurnas(BigDecimal.ZERO)
                .horasExtraNocturnas(BigDecimal.ZERO)
                .horasRecargoNocturno(BigDecimal.ZERO)
                .horasDominicalFestivo(BigDecimal.ZERO)
                .build();
    }

    @Test
    void crearParcialOk() {
        when(configService.obtenerValor("horasOrdinariasPorDia")).thenReturn(8);
        when(jornadaRepo.findByUsuarioIdAndFecha(usuarioId, fecha)).thenReturn(Optional.empty());
        when(usuarioRepo.findById(usuarioId)).thenReturn(Optional.of(usuario()));
        when(permisoRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Permiso result = service.crear(usuarioId, fecha, new BigDecimal("2"), TipoPermiso.PARCIAL, "cita medica");

        assertNotNull(result);
        assertEquals(TipoPermiso.PARCIAL, result.getTipo());
        assertEquals(EstadoPermiso.BORRADOR, result.getEstado());
        verify(permisoRepo).save(any());
    }

    @Test
    void crearCompletoRechazaSiHayJornada() {
        when(configService.obtenerValor(any())).thenReturn(8);
        when(jornadaRepo.findByUsuarioIdAndFecha(usuarioId, fecha))
                .thenReturn(Optional.of(jornadaConHoras(new BigDecimal("4"))));

        assertThrows(ValidacionException.class,
                () -> service.crear(usuarioId, fecha, new BigDecimal("8"), TipoPermiso.COMPLETO, "permiso completo"));
    }

    @Test
    void crearParcialRechazaSiExcedeHorasDisponibles() {
        // registradas 6h, disponible = 8 - 6 = 2, intento pedir 3 -> rechaza
        when(configService.obtenerValor("horasOrdinariasPorDia")).thenReturn(8);
        when(jornadaRepo.findByUsuarioIdAndFecha(usuarioId, fecha))
                .thenReturn(Optional.of(jornadaConHoras(new BigDecimal("6"))));

        assertThrows(ValidacionException.class,
                () -> service.crear(usuarioId, fecha, new BigDecimal("3"), TipoPermiso.PARCIAL, "excede"));
    }

    @Test
    void editarNoPermiteSiEnviado() {
        UUID permisoId = UUID.randomUUID();
        Usuario u = usuario();
        Permiso existente = Permiso.builder()
                .id(permisoId)
                .usuario(u)
                .fechaSolicitud(fecha)
                .horas(new BigDecimal("2"))
                .tipo(TipoPermiso.PARCIAL)
                .descripcion("desc")
                .estado(EstadoPermiso.ENVIADO)
                .build();
        when(permisoRepo.findById(permisoId)).thenReturn(Optional.of(existente));

        assertThrows(ValidacionException.class,
                () -> service.editar(usuarioId, permisoId, null, new BigDecimal("1"), null, null));
    }

    @Test
    void enviarCambiaAEnviado() {
        UUID permisoId = UUID.randomUUID();
        Usuario u = usuario();
        Permiso existente = Permiso.builder()
                .id(permisoId)
                .usuario(u)
                .fechaSolicitud(fecha)
                .horas(new BigDecimal("2"))
                .tipo(TipoPermiso.PARCIAL)
                .descripcion("desc")
                .estado(EstadoPermiso.BORRADOR)
                .build();
        when(permisoRepo.findById(permisoId)).thenReturn(Optional.of(existente));
        when(jornadaRepo.findByUsuarioIdAndFecha(usuarioId, fecha)).thenReturn(Optional.empty());
        when(configService.obtenerValor(any())).thenReturn(8);
        when(permisoRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Permiso result = service.enviar(usuarioId, permisoId);

        assertEquals(EstadoPermiso.ENVIADO, result.getEstado());
        verify(permisoRepo).save(any());
    }
}
