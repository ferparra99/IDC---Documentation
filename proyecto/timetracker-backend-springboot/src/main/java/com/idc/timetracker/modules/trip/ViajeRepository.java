package com.idc.timetracker.modules.trip;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ViajeRepository extends JpaRepository<Viaje, UUID> {

    List<Viaje> findByUsuarioIdOrderByFechaDesc(UUID usuarioId);

    List<Viaje> findByUsuarioIdAndFechaBetweenOrderByFechaAsc(UUID usuarioId, LocalDate desde, LocalDate hasta);

    List<Viaje> findByFechaBetweenOrderByFechaAsc(LocalDate desde, LocalDate hasta);
}
