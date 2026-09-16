package com.idc.timetracker.modules.holiday;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "festivos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Festivo {

    @Id
    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "pais", nullable = false, length = 2)
    @Builder.Default
    private String pais = "CO";

    @Column(name = "sincronizado_en", nullable = false, columnDefinition = "timestamptz")
    @Builder.Default
    private Instant sincronizadoEn = Instant.now();
}
