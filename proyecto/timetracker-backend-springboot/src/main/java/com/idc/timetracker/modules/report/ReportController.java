package com.idc.timetracker.modules.report;

import com.idc.timetracker.common.exception.NoAutorizadoException;
import com.idc.timetracker.common.exception.ValidacionException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.idc.timetracker.modules.user.UsuarioRepository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final UsuarioRepository usuarioRepository;

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equalsIgnoreCase("ROLE_administrador")
                        || a.getAuthority().equalsIgnoreCase("administrador")
                        || a.getAuthority().equalsIgnoreCase("ROLE_ADMIN")
        );
    }

    @GetMapping("/excel")
    public ResponseEntity<byte[]> excel(@AuthenticationPrincipal String userId,
                                        @RequestParam String desde,
                                        @RequestParam String hasta,
                                        @RequestParam(required = false) String usuarioId,
                                        @RequestParam(required = false) String usuarioIds) {
        if (desde == null || hasta == null) {
            throw new ValidacionException("Los parámetros 'desde' y 'hasta' (YYYY-MM-DD) son obligatorios.");
        }
        LocalDate d = LocalDate.parse(desde);
        LocalDate h = LocalDate.parse(hasta);

        boolean admin = isAdmin();
        List<UUID> objetivoIds = new ArrayList<>();

        // usuarioIds tiene prioridad (multi-selección)
        if (usuarioIds != null && !usuarioIds.isBlank()) {
            String[] parts = usuarioIds.split(",");
            for (String p : parts) {
                String t = p.trim();
                if (t.isEmpty()) continue;
                UUID uid = UUID.fromString(t);
                if (!uid.toString().equals(userId) && !admin) {
                    throw new NoAutorizadoException("No puedes exportar el reporte de otro usuario.");
                }
                objetivoIds.add(uid);
            }
            if (objetivoIds.isEmpty()) throw new ValidacionException("usuarioIds vacío");
        } else if (usuarioId != null && !usuarioId.isBlank()) {
            if (!usuarioId.equals(userId) && !admin) {
                throw new NoAutorizadoException("No puedes exportar el reporte de otro usuario.");
            }
            objetivoIds.add(UUID.fromString(usuarioId));
        } else {
            // sin filtro: admin -> consolidado (todos), empleado -> propio
            if (admin) {
                // legacy consolidado
                UUID effectiveId = UUID.fromString(userId);
                byte[] bytes = reportService.generarExcel(effectiveId, d, h, true);
                String filename = "reporte_" + desde + "_a_" + hasta + ".xlsx";
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                        .body(bytes);
            } else {
                objetivoIds.add(UUID.fromString(userId));
            }
        }

        // si llegó aquí con objetivoIds, usar flujo multi (single también via generarExcelForUsuarios)
        byte[] bytes = reportService.generarExcelForUsuarios(objetivoIds, d, h);
        String filename = "reporte_" + desde + "_a_" + hasta;
        if (objetivoIds.size() > 1) filename += "_" + objetivoIds.size() + "usuarios";
        filename += ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/usuarios")
    public ResponseEntity<java.util.Map<String, Object>> listarUsuariosParaReporte() {
        if (!isAdmin()) throw new NoAutorizadoException("Solo administradores pueden listar usuarios para reportes");
        var usuarios = usuarioRepository.findAll();
        List<java.util.Map<String, String>> res = usuarios.stream()
                .map(u -> java.util.Map.of(
                        "id", u.getId().toString(),
                        "nombre", u.getNombre() != null ? u.getNombre() : "",
                        "email", u.getEmail() != null ? u.getEmail() : "",
                        "rol", u.getRol() != null ? u.getRol().name() : ""
                ))
                .toList();
        // envuelto en {data: [...]} para que api/client.ts:81 (body.data) funcione
        return ResponseEntity.ok(java.util.Map.of("data", res));
    }
}
