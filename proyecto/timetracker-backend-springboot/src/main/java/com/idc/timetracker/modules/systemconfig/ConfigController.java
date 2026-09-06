package com.idc.timetracker.modules.systemconfig;

import com.idc.timetracker.common.exception.NoAutorizadoException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/config")
@RequiredArgsConstructor
public class ConfigController {

    private final SystemConfigService service;

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equalsIgnoreCase("ROLE_administrador")
                        || a.getAuthority().equalsIgnoreCase("administrador")
                        || a.getAuthority().equalsIgnoreCase("ROLE_ADMIN")
        );
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> vigentes() {
        return ResponseEntity.ok(Map.of("data", service.obtenerVigentes()));
    }

    @PutMapping("/{clave}")
    public ResponseEntity<Map<String, Object>> actualizar(@PathVariable String clave,
                                                          @RequestBody Map<String, Object> body) {
        if (!isAdmin()) {
            throw new NoAutorizadoException("Se requiere rol administrador");
        }
        Object valor = body.get("valor");
        String vigenteDesdeStr = (String) body.get("vigenteDesde");
        LocalDate vd = vigenteDesdeStr != null ? LocalDate.parse(vigenteDesdeStr) : LocalDate.now();
        var saved = service.actualizar(clave, valor, vd);
        return ResponseEntity.ok(Map.of("data", saved));
    }
}
