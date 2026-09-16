package com.idc.timetracker.common.security;

import com.idc.timetracker.common.config.AppProperties;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final Duration expiresIn;

    public JwtService(AppProperties props) {
        String secret = props.getJwt().getSecret();
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET debe tener al menos 32 caracteres");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiresIn = parseDuration(props.getJwt().getExpiresIn());
    }

    public String generarToken(String userId, String rol) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expiresIn.toMillis());
        return Jwts.builder()
                .subject(userId)
                .claim("rol", rol)
                .issuedAt(now)
                .expiration(exp)
                .signWith(key)
                .compact();
    }

    public Jws<Claims> verificar(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
    }

    public String getUserId(String token) {
        return verificar(token).getPayload().getSubject();
    }

    public String getRol(String token) {
        return verificar(token).getPayload().get("rol", String.class);
    }

    private Duration parseDuration(String s) {
        if (s == null) return Duration.ofHours(1);
        s = s.trim().toLowerCase();
        if (s.endsWith("h")) return Duration.ofHours(Long.parseLong(s.replace("h", "")));
        if (s.endsWith("m")) return Duration.ofMinutes(Long.parseLong(s.replace("m", "")));
        if (s.endsWith("d")) return Duration.ofDays(Long.parseLong(s.replace("d", "")));
        if (s.endsWith("s")) return Duration.ofSeconds(Long.parseLong(s.replace("s", "")));
        return Duration.parse(s);
    }
}
