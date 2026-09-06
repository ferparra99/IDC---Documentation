package com.idc.timetracker.modules.trip;

import com.idc.timetracker.modules.user.Usuario;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "viajes", indexes = @Index(name = "idx_viajes_usuario_fecha", columnList = "usuario_id, fecha"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Viaje {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "punto_partida", nullable = false)
    private String puntoPartida;

    @Column(name = "punto_final", nullable = false)
    private String puntoFinal;

    @Column(name = "descripcion", nullable = false, columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "valor", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal valor = new BigDecimal("5000.00");

    @Column(name = "creado_en", nullable = false, updatable = false, columnDefinition = "timestamptz")
    private Instant creadoEn;

    @Column(name = "actualizado_en", nullable = false, columnDefinition = "timestamptz")
    private Instant actualizadoEn;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (creadoEn == null) creadoEn = now;
        actualizadoEn = now;
        if (valor == null) valor = new BigDecimal("5000.00");
    }

    @PreUpdate
    void preUpdate() {
        actualizadoEn = Instant.now();
    }
}
