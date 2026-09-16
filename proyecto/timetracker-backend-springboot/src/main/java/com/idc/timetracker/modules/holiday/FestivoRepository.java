package com.idc.timetracker.modules.holiday;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface FestivoRepository extends JpaRepository<Festivo, LocalDate> {

    boolean existsByFecha(LocalDate fecha);

    boolean existsByFechaBetween(LocalDate inicio, LocalDate fin);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(f) > 0 FROM Festivo f WHERE f.fecha BETWEEN :inicio AND :fin")
    boolean existsInYear(@org.springframework.data.repository.query.Param("inicio") LocalDate inicio, @org.springframework.data.repository.query.Param("fin") LocalDate fin);
}
