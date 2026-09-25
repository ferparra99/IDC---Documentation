package com.idc.timetracker.modules.leave;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface PermisoRepository extends JpaRepository<Permiso, UUID> {

    List<Permiso> findByUsuarioIdOrderByFechaSolicitudDesc(UUID usuarioId);

    List<Permiso> findByUsuarioIdAndFechaSolicitud(UUID usuarioId, LocalDate fecha);

    List<Permiso> findByUsuarioIdAndFechaSolicitudBetween(UUID usuarioId, LocalDate desde, LocalDate hasta);

    List<Permiso> findByEstado(EstadoPermiso estado);

    List<Permiso> findByEstadoOrderByFechaSolicitudDesc(EstadoPermiso estado);

    List<Permiso> findAllByOrderByFechaSolicitudDesc();
}
