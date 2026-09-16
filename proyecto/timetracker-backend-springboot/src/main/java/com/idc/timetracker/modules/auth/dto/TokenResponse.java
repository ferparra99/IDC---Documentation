package com.idc.timetracker.modules.auth.dto;

import com.idc.timetracker.modules.user.RolUsuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TokenResponse {

    private String token;
    private String refreshToken;
    private UsuarioDto usuario;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UsuarioDto {
        private UUID id;
        private String nombre;
        private String email;
        private RolUsuario rol;
    }
}
