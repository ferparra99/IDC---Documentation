package com.idc.timetracker.modules.attendance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RegistroJornadaRepository extends JpaRepository<RegistroJornada, UUID> {

    Optional<RegistroJornada> findByUsuarioIdAndFecha(UUID usuarioId, LocalDate fecha);

    List<RegistroJornada> findByUsuarioIdAndEstadoOrderByFechaAsc(UUID usuarioId, EstadoJornada estado);

    List<RegistroJornada> findByUsuarioIdAndFechaBetweenOrderByFechaAsc(UUID usuarioId, LocalDate desde, LocalDate hasta);

    // alias sin OrderBy para compatibilidad con spec
    default List<RegistroJornada> findByUsuarioIdAndFechaBetween(UUID usuarioId, LocalDate desde, LocalDate hasta) {
        return findByUsuarioIdAndFechaBetweenOrderByFechaAsc(usuarioId, desde, hasta);
    }

    @Query("SELECT r FROM RegistroJornada r WHERE r.usuario.id = :usuarioId AND r.estado = com.idc.timetracker.modules.attendance.EstadoJornada.JORNADA_ACTIVA ORDER BY r.fecha ASC")
    List<RegistroJornada> findActivasPorUsuario(@Param("usuarioId") UUID usuarioId);
}
