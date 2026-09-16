package com.idc.timetracker.modules.systemconfig;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConfiguracionSistemaRepository extends JpaRepository<ConfiguracionSistema, UUID> {

    Optional<ConfiguracionSistema> findByClaveAndVigenteHastaIsNull(String clave);

    List<ConfiguracionSistema> findByClaveOrderByVigenteDesdeDesc(String clave);

    List<ConfiguracionSistema> findByVigenteHastaIsNull();

    Optional<ConfiguracionSistema> findByClaveAndVigenteDesde(String clave, LocalDate vigenteDesde);

    boolean existsByClaveAndVigenteHastaIsNull(String clave);

    List<ConfiguracionSistema> findByClave(String clave);
}
