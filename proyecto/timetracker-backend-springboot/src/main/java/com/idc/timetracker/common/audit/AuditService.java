package com.idc.timetracker.common.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void registrarEdicionJornada(UUID registroId, UUID usuarioId, Object valorAnterior, Object valorNuevo, String motivo) {
        audit("registro_jornada", registroId, usuarioId, valorAnterior, valorNuevo, motivo);
    }

    @Transactional
    public void audit(String entidad, UUID entidadId, UUID usuarioId, Object valorAnterior, Object valorNuevo, String motivo) {
        try {
            String anteriorJson = toJson(valorAnterior);
            String nuevoJson = toJson(valorNuevo);
            AuditLog entry = AuditLog.builder()
                    .entidad(entidad)
                    .entidadId(entidadId)
                    .usuarioId(usuarioId)
                    .valorAnterior(anteriorJson)
                    .valorNuevo(nuevoJson)
                    .motivo(motivo)
                    .build();
            repository.save(entry);
            log.info("AUDIT entidad={} id={} usuario={} motivo={}", entidad, entidadId, usuarioId, motivo);
        } catch (Exception e) {
            log.warn("No se pudo persistir audit: {}", e.getMessage());
        }
    }

    private String toJson(Object o) {
        if (o == null) return "null";
        if (o instanceof String s) return s;
        try {
            return objectMapper.writeValueAsString(o);
        } catch (Exception e) {
            return String.valueOf(o);
        }
    }
}
