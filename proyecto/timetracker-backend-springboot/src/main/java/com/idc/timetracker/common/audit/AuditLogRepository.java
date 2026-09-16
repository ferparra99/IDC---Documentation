package com.idc.timetracker.common.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    List<AuditLog> findByEntidadAndEntidadIdOrderByFechaCambioDesc(String entidad, UUID entidadId);

    List<AuditLog> findByUsuarioIdOrderByFechaCambioDesc(UUID usuarioId);
}
