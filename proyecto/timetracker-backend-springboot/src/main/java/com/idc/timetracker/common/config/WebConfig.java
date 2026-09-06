package com.idc.timetracker.common.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final AppProperties appProperties;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String allowed = appProperties.getCors().getAllowedOrigins();
        String[] origins;
        if (allowed == null || allowed.isBlank()) {
            origins = new String[]{"*"};
        } else if (allowed.trim().equals("*")) {
            origins = new String[]{"*"};
        } else {
            origins = allowed.split("\\s*,\\s*");
        }

        registry.addMapping("/**")
                .allowedOriginPatterns(origins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);
    }
}
