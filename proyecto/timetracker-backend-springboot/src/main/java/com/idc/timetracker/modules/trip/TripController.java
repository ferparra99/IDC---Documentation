package com.idc.timetracker.modules.trip;

import com.idc.timetracker.common.exception.NoAutorizadoException;
import com.idc.timetracker.common.exception.ValidacionException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/trips")
@RequiredArgsConstructor
public class TripController {

    private final ViajeService service;

    private UUID toUUID(String userId) { return UUID.fromString(userId); }

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
            throw new NoAutorizadoException("No puedes consultar los viajes de otro usuario.");
        }
        return UUID.fromString(eff);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> crear(@AuthenticationPrincipal String userId,
                                                     @RequestBody Map<String, Object> body) {
        if (body == null || body.get("fecha") == null || body.get("puntoPartida") == null || body.get("puntoFinal") == null || body.get("descripcion") == null) {
            throw new ValidacionException("Los campos 'fecha', 'puntoPartida', 'puntoFinal' y 'descripcion' son obligatorios.");
        }
        LocalDate fecha = LocalDate.parse((String) body.get("fecha"));
        String pp = (String) body.get("puntoPartida");
        String pf = (String) body.get("puntoFinal");
        String desc = (String) body.get("descripcion");
        BigDecimal valor = body.get("valor") != null ? new BigDecimal(body.get("valor").toString()) : null;
        var v = service.crear(toUUID(userId), fecha, pp, pf, desc, valor);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", v));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listar(@AuthenticationPrincipal String userId,
                                                      @RequestParam(required = false) String desde,
                                                      @RequestParam(required = false) String hasta,
                                                      @RequestParam(required = false) String usuarioId) {
        UUID efectivo = usuarioEfectivo(usuarioId, userId);
        List<Viaje> viajes;
        if (desde != null && hasta != null) {
            LocalDate d = LocalDate.parse(desde);
            LocalDate h = LocalDate.parse(hasta);
            viajes = service.listarPorRango(efectivo, d, h);
            return ResponseEntity.ok(Map.of("data", viajes));
        }
        // sin rango: comportamiento legacy listarOwn
        if (desde == null && hasta == null && (usuarioId == null || usuarioId.equals(userId))) {
            return ResponseEntity.ok(Map.of("data", service.listarOwn(efectivo)));
        }
        // si se pasó usuarioId distinto pero sin rango, aún listarOwn
        if (desde == null || hasta == null) {
            // requerir rango si se filtra por otro usuario con rango parcial
            if (desde != null || hasta != null) {
                throw new ValidacionException("Los parámetros 'desde' y 'hasta' (YYYY-MM-DD) son obligatorios.");
            }
            return ResponseEntity.ok(Map.of("data", service.listarOwn(efectivo)));
        }
        return ResponseEntity.ok(Map.of("data", service.listarOwn(efectivo)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> actualizar(@AuthenticationPrincipal String userId,
                                                          @PathVariable UUID id,
                                                          @RequestBody Map<String, Object> body) {
        LocalDate fecha = body.get("fecha") != null ? LocalDate.parse((String) body.get("fecha")) : null;
        String pp = (String) body.get("puntoPartida");
        String pf = (String) body.get("puntoFinal");
        String desc = (String) body.get("descripcion");
        BigDecimal valor = body.get("valor") != null ? new BigDecimal(body.get("valor").toString()) : null;
        var v = service.actualizar(toUUID(userId), id, fecha, pp, pf, desc, valor);
        return ResponseEntity.ok(Map.of("data", v));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@AuthenticationPrincipal String userId, @PathVariable UUID id) {
        service.eliminar(toUUID(userId), id);
        return ResponseEntity.noContent().build();
    }
}
