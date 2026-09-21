package com.idc.timetracker.modules.user;

import com.idc.timetracker.common.exception.NoAutorizadoException;
import com.idc.timetracker.common.exception.ValidacionException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    private boolean isAdmin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equalsIgnoreCase("ROLE_administrador")
                        || a.getAuthority().equalsIgnoreCase("administrador")
                        || a.getAuthority().equalsIgnoreCase("ROLE_ADMIN")
        );
    }

    private Map<String, Object> toMap(Usuario u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId().toString());
        m.put("nombre", u.getNombre());
        m.put("email", u.getEmail());
        m.put("rol", u.getRol().name());
        m.put("activo", u.getActivo());
        m.put("creadoEn", u.getCreadoEn() != null ? u.getCreadoEn().toString() : null);
        return m;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listar() {
        if (!isAdmin()) throw new NoAutorizadoException("Se requiere rol administrador.");
        var lista = usuarioRepository.findAll().stream().map(this::toMap).toList();
        return ResponseEntity.ok(Map.of("data", lista));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> crear(@RequestBody Map<String, Object> body) {
        if (!isAdmin()) throw new NoAutorizadoException("Se requiere rol administrador.");
        String nombre = body != null ? (String) body.get("nombre") : null;
        String email = body != null ? (String) body.get("email") : null;
        String password = body != null ? (String) body.get("password") : null;
        String rolRaw = body != null && body.get("rol") != null ? (String) body.get("rol") : "empleado";

        if (nombre == null || nombre.isBlank()) throw new ValidacionException("El campo 'nombre' es obligatorio.");
        if (email == null || email.isBlank()) throw new ValidacionException("El campo 'email' es obligatorio.");
        if (password == null || password.isBlank()) throw new ValidacionException("El campo 'password' es obligatorio.");
        if (password.length() < 6) throw new ValidacionException("La contraseña debe tener al menos 6 caracteres.");
        if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) throw new ValidacionException("El email no es válido.");

        RolUsuario rol;
        try {
            rol = RolUsuario.valueOf(rolRaw.toLowerCase());
        } catch (Exception e) {
            throw new ValidacionException("Rol inválido. Use 'empleado' o 'administrador'.");
        }
        // Requisito: admin crea usuarios tipo empleado (pero permitimos admin si se especifica explícitamente)
        if (usuarioRepository.existsByEmail(email)) {
            throw new ValidacionException("Ya existe un usuario con ese email.");
        }

        Usuario u = Usuario.builder()
                .nombre(nombre.trim())
                .email(email.trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(password))
                .rol(rol)
                .activo(true)
                .build();
        u = usuarioRepository.save(u);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", toMap(u)));
    }
}
