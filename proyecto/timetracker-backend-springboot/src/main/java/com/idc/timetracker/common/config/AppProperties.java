package com.idc.timetracker.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String zonaHoraria = "America/Bogota";
    private Jwt jwt = new Jwt();
    private Cors cors = new Cors();
    private Seed seed = new Seed();

    @Data
    public static class Jwt {
        private String secret;
        private String expiresIn = "1h";
        private String refreshExpiresIn = "30d";
    }

    @Data
    public static class Cors {
        private String allowedOrigins = "*";
    }

    @Data
    public static class Seed {
        private String adminEmail = "admin@empresa.com";
        private String adminPassword = "CambiarEnProduccion123";
        private String adminNombre = "Administrador Inicial";
        private boolean runOnStart = false;
    }
}
