package com.idc.timetracker.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Convierte DATABASE_URL estilo postgres:// o postgresql://user:pass@host:5432/db
 * a jdbc:postgresql://host:5432/db para Spring Datasource.
 * Si ya es jdbc:, no hace nada.
 */
public class DatabaseUrlConverter implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {

    private static final Logger log = LoggerFactory.getLogger(DatabaseUrlConverter.class);

    @Override
    public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
        ConfigurableEnvironment env = event.getEnvironment();
        String dbUrl = env.getProperty("DATABASE_URL");
        if (dbUrl == null || dbUrl.isBlank()) return;
        if (dbUrl.startsWith("jdbc:")) return;

        boolean isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
        if (!isPostgres) return;

        try {
            // Preferir URI para manejar passwords con caracteres especiales y query params (?sslmode=require)
            URI uri = new URI(dbUrl);
            String host = uri.getHost();
            int port = uri.getPort();
            String path = uri.getPath();
            String query = uri.getQuery();
            String rawUserInfo = uri.getRawUserInfo();

            String jdbc;
            String user = null;
            String pass = null;

            if (host != null) {
                StringBuilder sb = new StringBuilder("jdbc:postgresql://");
                sb.append(host);
                if (port != -1) sb.append(":").append(port);
                if (path != null) sb.append(path);
                if (query != null) sb.append("?").append(query);
                jdbc = sb.toString();

                if (rawUserInfo != null && !rawUserInfo.isEmpty()) {
                    int colon = rawUserInfo.indexOf(':');
                    if (colon != -1) {
                        user = URLDecoder.decode(rawUserInfo.substring(0, colon), StandardCharsets.UTF_8);
                        pass = URLDecoder.decode(rawUserInfo.substring(colon + 1), StandardCharsets.UTF_8);
                    } else {
                        user = URLDecoder.decode(rawUserInfo, StandardCharsets.UTF_8);
                    }
                }
            } else {
                // Fallback para URIs que java.net.URI no puede parsear (ej. password con @ sin encode)
                // Usa lastIndexOf('@') como heurística más robusta que indexOf
                String protoSep = "://";
                int protoIdx = dbUrl.indexOf(protoSep);
                String withoutProto = protoSep != null ? dbUrl.substring(protoIdx + protoSep.length()) : dbUrl;
                int atIdx = withoutProto.lastIndexOf('@');
                String creds = "";
                String hostPart;
                if (atIdx != -1) {
                    creds = withoutProto.substring(0, atIdx);
                    hostPart = withoutProto.substring(atIdx + 1);
                } else {
                    hostPart = withoutProto;
                }
                jdbc = "jdbc:postgresql://" + hostPart;
                if (!creds.isEmpty()) {
                    int colon = creds.indexOf(':');
                    if (colon != -1) {
                        user = URLDecoder.decode(creds.substring(0, colon), StandardCharsets.UTF_8);
                        pass = URLDecoder.decode(creds.substring(colon + 1), StandardCharsets.UTF_8);
                    } else {
                        user = URLDecoder.decode(creds, StandardCharsets.UTF_8);
                    }
                }
            }

            Map<String, Object> map = new HashMap<>();
            map.put("spring.datasource.url", jdbc);
            if (user != null) map.put("spring.datasource.username", user);
            if (pass != null) map.put("spring.datasource.password", pass);
            env.getPropertySources().addFirst(new MapPropertySource("databaseUrlConverter", map));
            log.info("DATABASE_URL convertida a JDBC: {} (user={})", jdbc, user != null ? "***" : "null");
        } catch (Exception e) {
            log.warn("No se pudo convertir DATABASE_URL a JDBC (valor original se usara y probablemente falle): {}", e.getMessage(), e);
        }
    }
}
