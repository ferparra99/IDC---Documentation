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

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

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
                                        @RequestParam(required = false) String usuarioId) {
        if (desde == null || hasta == null) {
            throw new ValidacionException("Los parámetros 'desde' y 'hasta' (YYYY-MM-DD) son obligatorios.");
        }
        LocalDate d = LocalDate.parse(desde);
        LocalDate h = LocalDate.parse(hasta);

        boolean admin = isAdmin();
        UUID effectiveId;
        boolean adminView = false;

        if (usuarioId != null && !usuarioId.isBlank()) {
            if (!usuarioId.equals(userId) && !admin) {
                throw new NoAutorizadoException("No puedes exportar el reporte de otro usuario.");
            }
            effectiveId = UUID.fromString(usuarioId);
            // admin pide reporte de un usuario específico -> no es vista consolidada
            adminView = false;
        } else {
            if (admin) {
                // consolidado: no filtrar por usuario
                effectiveId = UUID.fromString(userId); // dummy, will be ignored cuando adminView true
                adminView = true;
            } else {
                effectiveId = UUID.fromString(userId);
                adminView = false;
            }
        }

        byte[] bytes = reportService.generarExcel(effectiveId, d, h, adminView);
        String filename = "reporte_" + desde + "_a_" + hasta + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }
}
