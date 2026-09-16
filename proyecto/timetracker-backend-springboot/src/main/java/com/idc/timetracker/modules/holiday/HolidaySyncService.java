package com.idc.timetracker.modules.holiday;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;

@Slf4j
@Service
@RequiredArgsConstructor
public class HolidaySyncService {

    private final FestivoRepository festivoRepository;
    private final ColombianHolidaysService holidaysService;

    @Transactional
    public int sincronizarAnio(int anio) {
        var calculados = holidaysService.calcularParaAnio(anio);
        int inserted = 0;
        for (var c : calculados) {
            LocalDate fecha = LocalDate.parse(c.fecha());
            String nombre = c.nombre();
            Festivo festivo = Festivo.builder()
                    .fecha(fecha)
                    .nombre(nombre)
                    .pais("CO")
                    .sincronizadoEn(Instant.now())
                    .build();
            try {
                if (!festivoRepository.existsById(fecha)) {
                    festivoRepository.save(festivo);
                    inserted++;
                } else {
                    // update nombre/sincronizadoEn if changed
                    festivoRepository.findById(fecha).ifPresent(existing -> {
                        existing.setNombre(nombre);
                        existing.setSincronizadoEn(Instant.now());
                        festivoRepository.save(existing);
                    });
                }
            } catch (Exception e) {
                log.warn("No se pudo guardar festivo {}: {}", fecha, e.getMessage());
            }
        }
        log.info("Sincronizados {} festivos para año {} (nuevos {})", calculados.size(), anio, inserted);
        return inserted;
    }

    @Transactional
    public void ensureSync(int anio) {
        // si no existe al menos un festivo del año, sincroniza
        LocalDate inicio = LocalDate.of(anio, 1, 1);
        LocalDate fin = LocalDate.of(anio, 12, 31);
        boolean hasAny = festivoRepository.existsByFechaBetween(inicio, fin);
        if (!hasAny) {
            sincronizarAnio(anio);
        }
    }

    @Transactional
    public void sincronizarSiNecesario(int anio) {
        ensureSync(anio);
    }
}
