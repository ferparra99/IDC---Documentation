package com.idc.timetracker.modules.auth;

import com.idc.timetracker.common.exception.CredencialesInvalidasException;
import com.idc.timetracker.common.security.JwtService;
import com.idc.timetracker.modules.auth.dto.TokenResponse;
import com.idc.timetracker.modules.user.Usuario;
import com.idc.timetracker.modules.user.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public TokenResponse login(String email, String password) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .filter(u -> Boolean.TRUE.equals(u.getActivo()))
                .orElseThrow(() -> {
                    log.warn("Intento de login con email no existente o inactivo: {}", email);
                    return new CredencialesInvalidasException("Email o contraseña incorrectos.");
                });

        if (!passwordEncoder.matches(password, usuario.getPasswordHash())) {
            log.warn("Intento de login con contraseña incorrecta email={} usuarioId={}", email, usuario.getId());
            throw new CredencialesInvalidasException("Email o contraseña incorrectos.");
        }

        String token = jwtService.generarToken(usuario.getId().toString(), usuario.getRol().name());
        String refreshTokenPlano = generarYGuardarRefreshToken(usuario);

        log.info("Login exitoso usuarioId={} rol={}", usuario.getId(), usuario.getRol());
        return toTokenResponse(token, refreshTokenPlano, usuario);
    }

    @Transactional
    public TokenResponse refresh(String refreshTokenPlano) {
        String hash = sha256Hex(refreshTokenPlano);
        RefreshToken registro = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new CredencialesInvalidasException("El refresh token es inválido o expiró. Inicia sesión nuevamente."));

        if (Boolean.TRUE.equals(registro.getRevocado()) || registro.getExpiraEn().isBefore(Instant.now())) {
            throw new CredencialesInvalidasException("El refresh token es inválido o expiró. Inicia sesión nuevamente.");
        }

        Usuario usuario = registro.getUsuario();
        if (usuario == null) {
            usuario = usuarioRepository.findById(registro.getUsuario().getId()).orElse(null);
        }
        if (usuario == null || !Boolean.TRUE.equals(usuario.getActivo())) {
            throw new CredencialesInvalidasException("El usuario asociado al token ya no existe.");
        }

        registro.setRevocado(true);
        refreshTokenRepository.save(registro);

        String nuevoRefreshPlano = generarYGuardarRefreshToken(usuario);
        String nuevoAccessToken = jwtService.generarToken(usuario.getId().toString(), usuario.getRol().name());

        log.info("Token de acceso renovado usuarioId={}", usuario.getId());
        return toTokenResponse(nuevoAccessToken, nuevoRefreshPlano, usuario);
    }

    @Transactional
    public void logout(String refreshTokenPlano) {
        String hash = sha256Hex(refreshTokenPlano);
        refreshTokenRepository.findByTokenHash(hash).ifPresent(rt -> {
            rt.setRevocado(true);
            refreshTokenRepository.save(rt);
        });
        log.info("Sesión cerrada (refresh token revocado)");
    }

    private String generarYGuardarRefreshToken(Usuario usuario) {
        byte[] bytes = new byte[40];
        secureRandom.nextBytes(bytes);
        String tokenPlano = HexFormat.of().formatHex(bytes);
        String hash = sha256Hex(tokenPlano);
        Instant expiraEn = Instant.now().plus(30, ChronoUnit.DAYS);

        RefreshToken entity = RefreshToken.builder()
                .usuario(usuario)
                .tokenHash(hash)
                .expiraEn(expiraEn)
                .revocado(false)
                .build();
        refreshTokenRepository.save(entity);
        return tokenPlano;
    }

    private TokenResponse toTokenResponse(String token, String refreshToken, Usuario usuario) {
        TokenResponse.UsuarioDto dto = TokenResponse.UsuarioDto.builder()
                .id(usuario.getId())
                .nombre(usuario.getNombre())
                .email(usuario.getEmail())
                .rol(usuario.getRol())
                .build();
        return TokenResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .usuario(dto)
                .build();
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo calcular SHA-256", e);
        }
    }
}
