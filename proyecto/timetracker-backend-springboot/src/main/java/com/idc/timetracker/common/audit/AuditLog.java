package com.idc.timetracker.common.audit;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_log", indexes = @Index(name = "idx_audit_log_entidad", columnList = "entidad, entidad_id, fecha_cambio"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "entidad", nullable = false, length = 50)
    private String entidad;

    @Column(name = "entidad_id", nullable = false, columnDefinition = "uuid")
    private UUID entidadId;

    @Column(name = "usuario_id", nullable = false, columnDefinition = "uuid")
    private UUID usuarioId;

    @Column(name = "fecha_cambio", nullable = false, columnDefinition = "timestamptz")
    @Builder.Default
    private Instant fechaCambio = Instant.now();

    @Column(name = "valor_anterior", nullable = false, columnDefinition = "jsonb")
    private String valorAnterior;

    @Column(name = "valor_nuevo", nullable = false, columnDefinition = "jsonb")
    private String valorNuevo;

    @Column(name = "motivo", columnDefinition = "TEXT")
    private String motivo;

    @PrePersist
    void prePersist() {
        if (fechaCambio == null) fechaCambio = Instant.now();
    }
}
