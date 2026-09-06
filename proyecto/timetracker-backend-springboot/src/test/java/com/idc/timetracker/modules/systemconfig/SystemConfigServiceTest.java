package com.idc.timetracker.modules.systemconfig;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SystemConfigServiceTest {

    private ConfiguracionSistemaRepository repository;
    private ObjectMapper objectMapper;
    private SystemConfigService service;

    @BeforeEach
    void setup() {
        repository = mock(ConfiguracionSistemaRepository.class);
        objectMapper = new ObjectMapper();
        service = new SystemConfigService(repository, objectMapper);
        SecurityContextHolder.clearContext();
    }

    @Test
    void obtenerVigentesParseaJSON() {
        ConfiguracionSistema c1 = ConfiguracionSistema.builder()
                .clave("horasOrdinariasPorDia")
                .valor("8")
                .vigenteDesde(LocalDate.of(2026, 1, 1))
                .vigenteHasta(null)
                .build();
        ConfiguracionSistema c2 = ConfiguracionSistema.builder()
                .clave("valorViajePorDefecto")
                .valor("\"5000.00\"")
                .vigenteDesde(LocalDate.of(2026, 1, 1))
                .vigenteHasta(null)
                .build();
        when(repository.findByVigenteHastaIsNull()).thenReturn(List.of(c1, c2));

        var map = service.obtenerVigentes();

        assertEquals(2, map.size());
        assertEquals(8, map.get("horasOrdinariasPorDia"));
        assertEquals("5000.00", map.get("valorViajePorDefecto"));
    }

    @Test
    void actualizarCierraVigenteHastaAnteriorYCreaNuevo() {
        // set admin auth to pass assertAdmin
        var auth = new UsernamePasswordAuthenticationToken("admin", null,
                List.of(new SimpleGrantedAuthority("ROLE_administrador")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        LocalDate vigenteDesde = LocalDate.of(2026, 6, 1);
        ConfiguracionSistema vigente = ConfiguracionSistema.builder()
                .clave("horasOrdinariasPorDia")
                .valor("8")
                .vigenteDesde(LocalDate.of(2026, 1, 1))
                .vigenteHasta(null)
                .build();
        when(repository.findByClaveAndVigenteHastaIsNull("horasOrdinariasPorDia"))
                .thenReturn(Optional.of(vigente));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        ConfiguracionSistema nuevo = service.actualizar("horasOrdinariasPorDia", 9, vigenteDesde);

        assertNotNull(nuevo);
        assertEquals(vigenteDesde, nuevo.getVigenteDesde());
        assertNull(nuevo.getVigenteHasta());
        // anterior debe haberse cerrado en vigenteDesde -1
        assertEquals(LocalDate.of(2026, 5, 31), vigente.getVigenteHasta());
        verify(repository, atLeastOnce()).save(any());
    }
}
