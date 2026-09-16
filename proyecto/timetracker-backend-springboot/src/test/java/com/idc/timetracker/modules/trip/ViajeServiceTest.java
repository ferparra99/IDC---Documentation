package com.idc.timetracker.modules.trip;

import com.idc.timetracker.common.exception.NoAutorizadoException;
import com.idc.timetracker.modules.systemconfig.SystemConfigService;
import com.idc.timetracker.modules.user.RolUsuario;
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

class ViajeServiceTest {

    private ViajeRepository viajeRepo;
    private UsuarioRepository usuarioRepo;
    private SystemConfigService configService;
    private ViajeService service;

    private final UUID usuarioId = UUID.randomUUID();
    private final LocalDate fecha = LocalDate.of(2026, 3, 15);

    @BeforeEach
    void setup() {
        viajeRepo = mock(ViajeRepository.class);
        usuarioRepo = mock(UsuarioRepository.class);
        configService = mock(SystemConfigService.class);
        service = new ViajeService(viajeRepo, usuarioRepo, configService);
    }

    private Usuario usuario(UUID id, RolUsuario rol) {
        return Usuario.builder().id(id).email("u@test.com").nombre("U").rol(rol).build();
    }

    @Test
    void crearOkConValorDefault5000SiValorNull() {
        when(usuarioRepo.findById(usuarioId)).thenReturn(Optional.of(usuario(usuarioId, RolUsuario.empleado)));
        when(configService.obtenerValor("valorViajePorDefecto")).thenReturn(null);
        when(viajeRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Viaje result = service.crear(usuarioId, fecha, "Bogota", "Medellin", "Reunion", null);

        assertNotNull(result);
        assertEquals(new BigDecimal("5000.00"), result.getValor());
        verify(viajeRepo).save(any());
    }

    @Test
    void crearConValorCustom() {
        BigDecimal custom = new BigDecimal("12345.67");
        when(usuarioRepo.findById(usuarioId)).thenReturn(Optional.of(usuario(usuarioId, RolUsuario.empleado)));
        when(viajeRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Viaje result = service.crear(usuarioId, fecha, "A", "B", "Viaje custom", custom);

        assertEquals(custom, result.getValor());
    }

    @Test
    void eliminarNoAutorizadoSiOtroUsuarioNoAdmin() {
        UUID otroId = UUID.randomUUID();
        UUID viajeId = UUID.randomUUID();
        Usuario owner = usuario(usuarioId, RolUsuario.empleado);
        Viaje viaje = Viaje.builder()
                .id(viajeId)
                .usuario(owner)
                .fecha(fecha)
                .puntoPartida("A")
                .puntoFinal("B")
                .descripcion("desc")
                .valor(new BigDecimal("5000"))
                .build();
        when(viajeRepo.findById(viajeId)).thenReturn(Optional.of(viaje));
        Usuario solicitante = usuario(otroId, RolUsuario.empleado);
        when(usuarioRepo.findById(otroId)).thenReturn(Optional.of(solicitante));

        assertThrows(NoAutorizadoException.class, () -> service.eliminar(otroId, viajeId));
    }

    @Test
    void actualizarModificaCampos() {
        UUID viajeId = UUID.randomUUID();
        Usuario owner = usuario(usuarioId, RolUsuario.empleado);
        Viaje viaje = Viaje.builder()
                .id(viajeId)
                .usuario(owner)
                .fecha(fecha)
                .puntoPartida("A")
                .puntoFinal("B")
                .descripcion("old")
                .valor(new BigDecimal("5000"))
                .build();
        when(viajeRepo.findById(viajeId)).thenReturn(Optional.of(viaje));
        when(viajeRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        LocalDate nuevaFecha = LocalDate.of(2026, 4, 1);
        Viaje actualizado = service.actualizar(usuarioId, viajeId, nuevaFecha, "NuevoA", "NuevoB", "Nueva desc", new BigDecimal("9999"));

        assertEquals(nuevaFecha, actualizado.getFecha());
        assertEquals("NuevoA", actualizado.getPuntoPartida());
        assertEquals("NuevoB", actualizado.getPuntoFinal());
        assertEquals("Nueva desc", actualizado.getDescripcion());
        assertEquals(new BigDecimal("9999"), actualizado.getValor());
    }
}
