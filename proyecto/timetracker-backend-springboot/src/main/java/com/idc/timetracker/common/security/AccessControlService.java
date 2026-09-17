package com.idc.timetracker.common.security;

import com.idc.timetracker.common.exception.NoAutorizadoException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Centraliza el chequeo de rol administrador y la resolución de usuario efectivo.
 * Evita duplicar isAdmin() en cada controller (antes en Attendance/Calendar/Report/Leave).
 */
@Service
public class AccessControlService {

    public boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equalsIgnoreCase("ROLE_administrador")
                        || a.getAuthority().equalsIgnoreCase("administrador")
                        || a.getAuthority().equalsIgnoreCase("ROLE_ADMIN"));
    }

    public void requireAdmin() {
        if (!isAdmin()) throw new NoAutorizadoException("Se requiere rol administrador.");
    }

    public UUID usuarioEfectivo(String solicitado, String actual) {
        String eff = (solicitado != null && !solicitado.isBlank()) ? solicitado : actual;
        if (!eff.equals(actual) && !isAdmin()) {
            throw new NoAutorizadoException("No puedes consultar información de otro usuario.");
        }
        return UUID.fromString(eff);
    }
}
