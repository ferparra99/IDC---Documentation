package com.idc.timetracker.modules.leave;

import com.idc.timetracker.common.exception.ValidacionException;
import com.idc.timetracker.modules.user.Usuario;
import com.idc.timetracker.modules.user.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/leaves")
@RequiredArgsConstructor
public class LeaveController {

    private final PermisoService service;
    private final UsuarioRepository usuarioRepository;

    private UUID toUUID(String userId) {
        return UUID.fromString(userId);
    }

    private boolean isAdmin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equalsIgnoreCase("ROLE_administrador")
                        || a.getAuthority().equalsIgnoreCase("administrador")
                        || a.getAuthority().equalsIgnoreCase("ROLE_ADMIN")
        );
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> crear(@AuthenticationPrincipal String userId,
                                                     @RequestBody Map<String, Object> body) {
        if (body == null || body.get("fechaSolicitud") == null || body.get("horas") == null || body.get("tipo") == null || body.get("descripcion") == null) {
            throw new ValidacionException("Los campos 'fechaSolicitud', 'horas', 'tipo' y 'descripcion' son obligatorios.");
        }
        LocalDate fecha = LocalDate.parse((String) body.get("fechaSolicitud"));
        BigDecimal horas = new BigDecimal(body.get("horas").toString());
        TipoPermiso tipo = TipoPermiso.valueOf((String) body.get("tipo"));
        String desc = (String) body.get("descripcion");
        var p = service.crear(toUUID(userId), fecha, horas, tipo, desc);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", p));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listar(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(Map.of("data", service.listar(toUUID(userId))));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> editar(@AuthenticationPrincipal String userId,
                                                      @PathVariable UUID id,
                                                      @RequestBody Map<String, Object> body) {
        LocalDate fecha = body.get("fechaSolicitud") != null ? LocalDate.parse((String) body.get("fechaSolicitud")) : null;
        BigDecimal horas = body.get("horas") != null ? new BigDecimal(body.get("horas").toString()) : null;
        TipoPermiso tipo = body.get("tipo") != null ? TipoPermiso.valueOf((String) body.get("tipo")) : null;
        String desc = (String) body.get("descripcion");
        // Si body trae campos vacíos, validar: al menos uno debe venir, sino servicio maneja nulls
        var p = service.editar(toUUID(userId), id, fecha, horas, tipo, desc);
        return ResponseEntity.ok(Map.of("data", p));
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<Map<String, Object>> preview(@AuthenticationPrincipal String userId,
                                                       @PathVariable UUID id) {
        UUID uid = toUUID(userId);
        boolean admin = isAdmin();
        Permiso permiso = service.obtener(uid, id);
        // Si es admin y el permiso no es propio, permitir ver igual (obtener ya valida admin)
        // Obtener datos del empleado
        Usuario empleado = usuarioRepository.findById(permiso.getUsuario().getId()).orElse(permiso.getUsuario());
        Map<String, Object> empleadoMap = new HashMap<>();
        empleadoMap.put("id", empleado.getId().toString());
        empleadoMap.put("nombre", empleado.getNombre());
        empleadoMap.put("email", empleado.getEmail());
        empleadoMap.put("rol", empleado.getRol() != null ? empleado.getRol().name() : null);

        Map<String, Object> permisoMap = new HashMap<>();
        permisoMap.put("id", permiso.getId().toString());
        permisoMap.put("fechaSolicitud", permiso.getFechaSolicitud().toString());
        permisoMap.put("horas", permiso.getHoras());
        permisoMap.put("tipo", permiso.getTipo().name());
        permisoMap.put("descripcion", permiso.getDescripcion());
        permisoMap.put("estado", permiso.getEstado().name());

        Map<String, Object> data = Map.of("empleado", empleadoMap, "permiso", permisoMap);
        return ResponseEntity.ok(Map.of("data", data));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<Map<String, Object>> submit(@AuthenticationPrincipal String userId,
                                                      @PathVariable UUID id) {
        var p = service.enviar(toUUID(userId), id);
        return ResponseEntity.ok(Map.of("data", p));
    }
}
