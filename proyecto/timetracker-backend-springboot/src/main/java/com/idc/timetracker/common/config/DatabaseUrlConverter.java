package com.idc.timetracker.common.config;

import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * Convierte DATABASE_URL estilo postgres://user:pass@host:5432/db
 * a jdbc:postgresql://host:5432/db para Spring Datasource.
 * Si ya es jdbc://, no hace nada.
 */
public class DatabaseUrlConverter implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {
    @Override
    public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
        ConfigurableEnvironment env = event.getEnvironment();
        String dbUrl = env.getProperty("DATABASE_URL");
        if (dbUrl != null && dbUrl.startsWith("postgres://")) {
            try {
                // postgres://user:pass@host:port/db
                String withoutProto = dbUrl.substring("postgres://".length());
                int atIdx = withoutProto.indexOf('@');
                String creds = "";
                String hostPart;
                if (atIdx != -1) {
                    creds = withoutProto.substring(0, atIdx);
                    hostPart = withoutProto.substring(atIdx + 1);
                } else {
                    hostPart = withoutProto;
                }
                String jdbc = "jdbc:postgresql://" + hostPart;
                String user = null, pass = null;
                if (!creds.isEmpty()) {
                    int colon = creds.indexOf(':');
                    if (colon != -1) {
                        user = creds.substring(0, colon);
                        pass = creds.substring(colon + 1);
                    } else {
                        user = creds;
                    }
                }
                Map<String, Object> map = new HashMap<>();
                map.put("spring.datasource.url", jdbc);
                if (user != null) map.put("spring.datasource.username", user);
                if (pass != null) map.put("spring.datasource.password", pass);
                env.getPropertySources().addFirst(new MapPropertySource("databaseUrlConverter", map));
            } catch (Exception ignored) {}
        }
    }
}
