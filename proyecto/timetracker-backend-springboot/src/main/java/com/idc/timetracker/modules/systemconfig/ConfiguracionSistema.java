package com.idc.timetracker.modules.systemconfig;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "configuracion_sistema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfiguracionSistema {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "clave", nullable = false, length = 80)
    private String clave;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "valor", nullable = false, columnDefinition = "jsonb")
    private String valor;

    @Column(name = "vigente_desde", nullable = false)
    private LocalDate vigenteDesde;

    @Column(name = "vigente_hasta")
    private LocalDate vigenteHasta;

    @Column(name = "creado_por", columnDefinition = "uuid")
    private UUID creadoPor;

    @Column(name = "creado_en", nullable = false, columnDefinition = "timestamptz")
    private Instant creadoEn;

    @PrePersist
    void prePersist() {
        if (creadoEn == null) creadoEn = Instant.now();
    }
}
