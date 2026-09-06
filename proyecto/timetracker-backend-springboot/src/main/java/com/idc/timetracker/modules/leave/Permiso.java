package com.idc.timetracker.modules.leave;

import com.idc.timetracker.modules.user.Usuario;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "permisos", indexes = @Index(name = "idx_permisos_usuario_fecha", columnList = "usuario_id, fecha_solicitud"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permiso {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "fecha_solicitud", nullable = false)
    private LocalDate fechaSolicitud;

    @Column(name = "horas", nullable = false, precision = 4, scale = 2)
    private BigDecimal horas;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, columnDefinition = "tipo_permiso")
    private TipoPermiso tipo;

    @Column(name = "descripcion", nullable = false, columnDefinition = "TEXT")
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, columnDefinition = "estado_permiso")
    @Builder.Default
    private EstadoPermiso estado = EstadoPermiso.BORRADOR;

    @Column(name = "creado_en", nullable = false, updatable = false, columnDefinition = "timestamptz")
    private Instant creadoEn;

    @Column(name = "actualizado_en", nullable = false, columnDefinition = "timestamptz")
    private Instant actualizadoEn;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (creadoEn == null) creadoEn = now;
        actualizadoEn = now;
        if (estado == null) estado = EstadoPermiso.BORRADOR;
    }

    @PreUpdate
    void preUpdate() {
        actualizadoEn = Instant.now();
    }
}
