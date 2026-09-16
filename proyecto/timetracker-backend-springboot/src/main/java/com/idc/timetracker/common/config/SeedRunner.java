package com.idc.timetracker.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.idc.timetracker.modules.systemconfig.ConfiguracionSistema;
import com.idc.timetracker.modules.systemconfig.ConfiguracionSistemaRepository;
import com.idc.timetracker.modules.user.RolUsuario;
import com.idc.timetracker.modules.user.Usuario;
import com.idc.timetracker.modules.user.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class SeedRunner implements CommandLineRunner {

    private final AppProperties appProperties;
    private final UsuarioRepository usuarioRepository;
    private final ConfiguracionSistemaRepository configuracionRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (!appProperties.getSeed().isRunOnStart()) {
            log.info("Seed deshabilitado (app.seed.run-on-start=false), se omite.");
            return;
        }

        String adminEmail = appProperties.getSeed().getAdminEmail();
        String adminPassword = appProperties.getSeed().getAdminPassword();
        String adminNombre = appProperties.getSeed().getAdminNombre();

        Usuario admin = usuarioRepository.findByEmail(adminEmail).orElse(null);
        if (admin == null) {
            String hash = passwordEncoder.encode(adminPassword);
            admin = Usuario.builder()
                    .nombre(adminNombre)
                    .email(adminEmail)
                    .passwordHash(hash)
                    .rol(RolUsuario.administrador)
                    .activo(true)
                    .build();
            admin = usuarioRepository.save(admin);
            log.info("Seed: usuario administrador creado: {}", adminEmail);
        } else {
            log.info("Seed: usuario administrador ya existe ({}), no se duplica.", adminEmail);
        }

        ZoneId zona = ZoneId.of(appProperties.getZonaHoraria());
        LocalDate hoy = LocalDate.now(zona);

        Map<String, Object> configInicial = new LinkedHashMap<>();
        configInicial.put("horaEntradaEstandar", "08:00");
        configInicial.put("horaSalidaEstandar", "17:00");
        configInicial.put("horasMinimasSemanales", 42);
        configInicial.put("horasOrdinariasPorDia", 8);
        configInicial.put("inicioHorarioNocturno", "19:00");
        configInicial.put("finHorarioNocturno", "06:00");
        configInicial.put("recargoNocturno", 35);
        configInicial.put("recargoExtraDiurna", 25);
        configInicial.put("recargoExtraNocturna", 75);
        configInicial.put("recargoDominicalFestivo", 90);
        configInicial.put("maxHorasExtraDiarias", 2);
        configInicial.put("maxHorasExtraSemanales", 12);
        configInicial.put("valorViajePorDefecto", 5000);

        for (Map.Entry<String, Object> entry : configInicial.entrySet()) {
            String clave = entry.getKey();
            if (configuracionRepository.existsByClaveAndVigenteHastaIsNull(clave)) {
                log.debug("Seed: configuracion '{}' ya tiene version vigente, se omite.", clave);
                continue;
            }
            String valorJson;
            try {
                valorJson = objectMapper.writeValueAsString(entry.getValue());
            } catch (Exception e) {
                valorJson = String.valueOf(entry.getValue());
            }
            ConfiguracionSistema cs = ConfiguracionSistema.builder()
                    .clave(clave)
                    .valor(valorJson)
                    .vigenteDesde(hoy)
                    .vigenteHasta(null)
                    .creadoPor(admin.getId())
                    .creadoEn(Instant.now())
                    .build();
            configuracionRepository.save(cs);
            log.info("Seed: configuracion sembrada: {} = {}", clave, valorJson);
        }

        log.info("Seed completado.");
    }
}
