package com.idc.timetracker.modules.calendar;

import com.idc.timetracker.common.exception.NoAutorizadoException;
import com.idc.timetracker.modules.calendar.dto.DiaCalendarioDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarService calendarService;

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equalsIgnoreCase("ROLE_administrador")
                        || a.getAuthority().equalsIgnoreCase("administrador")
                        || a.getAuthority().equalsIgnoreCase("ROLE_ADMIN")
        );
    }

    private UUID usuarioEfectivo(String solicitado, String actual) {
        String eff = (solicitado != null && !solicitado.isBlank()) ? solicitado : actual;
        if (!eff.equals(actual) && !isAdmin()) {
            throw new NoAutorizadoException("No puedes consultar el calendario de otro usuario.");
        }
        return UUID.fromString(eff);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> obtenerMes(@RequestParam int anio,
                                                         @RequestParam int mes,
                                                         @RequestParam(required = false) String usuarioId,
                                                         @AuthenticationPrincipal String userId) {
        UUID efectivo = usuarioEfectivo(usuarioId, userId);
        List<DiaCalendarioDTO> dias = calendarService.obtenerMes(anio, mes, efectivo);
        return ResponseEntity.ok(Map.of("data", dias));
    }
}
