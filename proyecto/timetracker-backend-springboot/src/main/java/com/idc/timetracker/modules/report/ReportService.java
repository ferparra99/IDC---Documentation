package com.idc.timetracker.modules.report;

import com.idc.timetracker.modules.attendance.RegistroJornada;
import com.idc.timetracker.modules.attendance.RegistroJornadaRepository;
import com.idc.timetracker.modules.trip.Viaje;
import com.idc.timetracker.modules.trip.ViajeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final RegistroJornadaRepository registroRepo;
    private final ViajeRepository viajeRepo;
    private final ExcelReportBuilder excelBuilder;

    @Transactional(readOnly = true)
    public byte[] generarExcel(UUID usuarioId, LocalDate desde, LocalDate hasta, boolean adminView) {
        List<RegistroJornada> jornadas;
        List<Viaje> viajes;
        if (adminView) {
            jornadas = registroRepo.findAll().stream()
                    .filter(r -> !r.getFecha().isBefore(desde) && !r.getFecha().isAfter(hasta))
                    .sorted((a,b)-> a.getFecha().compareTo(b.getFecha()))
                    .toList();
            viajes = viajeRepo.findByFechaBetweenOrderByFechaAsc(desde, hasta);
        } else {
            jornadas = registroRepo.findByUsuarioIdAndFechaBetweenOrderByFechaAsc(usuarioId, desde, hasta);
            viajes = viajeRepo.findByUsuarioIdAndFechaBetweenOrderByFechaAsc(usuarioId, desde, hasta);
        }
        return excelBuilder.build(jornadas, viajes);
    }

    @Transactional(readOnly = true)
    public byte[] generarExcelOwn(UUID usuarioId, LocalDate desde, LocalDate hasta) {
        return generarExcel(usuarioId, desde, hasta, false);
    }
}
