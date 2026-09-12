package com.idc.timetracker.modules.attendance;

import com.idc.timetracker.modules.user.Usuario;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "registro_jornada",
        uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "fecha"}),
        indexes = {
                @Index(name = "idx_registro_jornada_usuario_fecha", columnList = "usuario_id, fecha"),
                @Index(name = "idx_registro_jornada_estado", columnList = "usuario_id, estado")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistroJornada {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_inicio", columnDefinition = "timestamptz")
    private Instant horaInicio;

    @Column(name = "hora_fin", columnDefinition = "timestamptz")
    private Instant horaFin;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "estado", nullable = false, columnDefinition = "estado_jornada")
    @Builder.Default
    private EstadoJornada estado = EstadoJornada.SIN_INICIAR;

    @Column(name = "descripcion_proyectos", columnDefinition = "TEXT")
    private String descripcionProyectos;

    @Column(name = "horas_ordinarias", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal horasOrdinarias = BigDecimal.ZERO;

    @Column(name = "horas_extra_diurnas", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal horasExtraDiurnas = BigDecimal.ZERO;

    @Column(name = "horas_extra_nocturnas", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal horasExtraNocturnas = BigDecimal.ZERO;

    @Column(name = "horas_recargo_nocturno", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal horasRecargoNocturno = BigDecimal.ZERO;

    @Column(name = "horas_dominical_festivo", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal horasDominicalFestivo = BigDecimal.ZERO;

    @Column(name = "editado_manualmente", nullable = false)
    @Builder.Default
    private boolean editadoManualmente = false;

    @Column(name = "creado_en", nullable = false, updatable = false, columnDefinition = "timestamptz")
    private Instant creadoEn;

    @Column(name = "actualizado_en", nullable = false, columnDefinition = "timestamptz")
    private Instant actualizadoEn;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (creadoEn == null) creadoEn = now;
        actualizadoEn = now;
        if (estado == null) estado = EstadoJornada.SIN_INICIAR;
        if (horasOrdinarias == null) horasOrdinarias = BigDecimal.ZERO;
        if (horasExtraDiurnas == null) horasExtraDiurnas = BigDecimal.ZERO;
        if (horasExtraNocturnas == null) horasExtraNocturnas = BigDecimal.ZERO;
        if (horasRecargoNocturno == null) horasRecargoNocturno = BigDecimal.ZERO;
        if (horasDominicalFestivo == null) horasDominicalFestivo = BigDecimal.ZERO;
    }

    @PreUpdate
    void preUpdate() {
        actualizadoEn = Instant.now();
    }
}
