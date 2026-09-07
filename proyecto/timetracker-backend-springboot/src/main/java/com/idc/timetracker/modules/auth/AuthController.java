package com.idc.timetracker.modules.auth;

import com.idc.timetracker.modules.auth.dto.LoginRequest;
import com.idc.timetracker.modules.auth.dto.TokenResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, TokenResponse>> login(@Valid @RequestBody LoginRequest request) {
        TokenResponse resultado = authService.login(request.getEmail(), request.getPassword());
        return ResponseEntity.ok(Map.of("data", resultado));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, TokenResponse>> refresh(@RequestBody(required = false) Map<String, String> body) {
        String refreshToken = body != null ? body.get("refreshToken") : null;
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new com.idc.timetracker.common.exception.ValidacionException("El campo 'refreshToken' es obligatorio.");
        }
        TokenResponse resultado = authService.refresh(refreshToken);
        return ResponseEntity.ok(Map.of("data", resultado));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false) Map<String, String> body) {
        String refreshToken = body != null ? body.get("refreshToken") : null;
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new com.idc.timetracker.common.exception.ValidacionException("El campo 'refreshToken' es obligatorio.");
        }
        authService.logout(refreshToken);
        return ResponseEntity.noContent().build();
    }
}
