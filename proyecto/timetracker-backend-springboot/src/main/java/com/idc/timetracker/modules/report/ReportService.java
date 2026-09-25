package com.idc.timetracker.modules.report;

import com.idc.timetracker.common.audit.AuditLogRepository;
import com.idc.timetracker.modules.attendance.RegistroJornada;
import com.idc.timetracker.modules.attendance.RegistroJornadaRepository;
import com.idc.timetracker.modules.leave.Permiso;
import com.idc.timetracker.modules.leave.PermisoRepository;
import com.idc.timetracker.modules.trip.Viaje;
import com.idc.timetracker.modules.trip.ViajeRepository;
import com.idc.timetracker.common.util.TiempoUtil;
import com.idc.timetracker.modules.attendance.CalculadoraHorasService;
import com.idc.timetracker.modules.attendance.SegmentoExtra;
import com.idc.timetracker.modules.holiday.FestivoRepository;
import com.idc.timetracker.modules.user.Usuario;
import com.idc.timetracker.modules.user.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final RegistroJornadaRepository registroRepo;
    private final ViajeRepository viajeRepo;
    private final UsuarioRepository usuarioRepo;
    private final PermisoRepository permisoRepo;
    private final AuditLogRepository auditRepo;
    private final ExcelReportBuilder excelBuilder;
    private final CalculadoraHorasService calculadora;
    private final FestivoRepository festivoRepository;
    private final TiempoUtil tiempoUtil;

    private static final ZoneId ZONA_BOGOTA = ZoneId.of("America/Bogota");

    @Transactional(readOnly = true)
    public byte[] generarExcel(UUID usuarioId, LocalDate desde, LocalDate hasta, boolean adminView) {
        if (adminView) {
            List<RegistroJornada> todasJornadas = registroRepo.findByFechaBetweenOrderByFechaAsc(desde, hasta);
            List<Viaje> todosViajes = viajeRepo.findByFechaBetweenOrderByFechaAsc(desde, hasta);
            if (todasJornadas.isEmpty() && todosViajes.isEmpty()) {
                return excelBuilder.build("VARIOS USUARIOS", LocalDate.now(ZONA_BOGOTA), List.of(), List.of(), Map.of(), Map.of());
            }
            Map<UUID, Usuario> usuarioCache = new LinkedHashMap<>();
            Map<UUID, List<RegistroJornada>> jById = new LinkedHashMap<>();
            Map<UUID, List<Viaje>> vById = new LinkedHashMap<>();
            Map<UUID, String> obs = buildObservaciones(todasJornadas);
            for (RegistroJornada r : todasJornadas) {
                Usuario u = r.getUsuario();
                if (u != null && u.getId() != null) {
                    usuarioCache.putIfAbsent(u.getId(), u);
                    jById.computeIfAbsent(u.getId(), k -> new ArrayList<>()).add(r);
                    vById.computeIfAbsent(u.getId(), k -> new ArrayList<>());
                }
            }
            for (Viaje v : todosViajes) {
                Usuario u = v.getUsuario();
                if (u != null && u.getId() != null) {
                    usuarioCache.putIfAbsent(u.getId(), u);
                    vById.computeIfAbsent(u.getId(), k -> new ArrayList<>()).add(v);
                    jById.computeIfAbsent(u.getId(), k -> new ArrayList<>());
                }
            }
            for (UUID id : new HashSet<>(usuarioCache.keySet())) {
                try {
                    Usuario full = usuarioRepo.findById(id).orElse(usuarioCache.get(id));
                    usuarioCache.put(id, full);
                } catch (Exception ignored) {}
            }
            Map<Usuario, List<RegistroJornada>> jPorUsuario = new LinkedHashMap<>();
            Map<Usuario, List<Viaje>> vPorUsuario = new LinkedHashMap<>();
            Map<Usuario, Map<LocalDate, Permiso>> pPorUsuario = new LinkedHashMap<>();
            Map<UUID, List<SegmentoExtra>> segsByRegistro = buildSegmentos(todasJornadas);
            for (UUID id : usuarioCache.keySet()) {
                Usuario u = usuarioCache.get(id);
                jPorUsuario.put(u, jById.getOrDefault(id, List.of()));
                vPorUsuario.put(u, vById.getOrDefault(id, List.of()));
                List<Permiso> perms = permisoRepo.findByUsuarioIdAndFechaSolicitudBetween(id, desde, hasta);
                Map<LocalDate, Permiso> map = perms.stream().collect(Collectors.toMap(Permiso::getFechaSolicitud, p -> p, (a,b)->a, LinkedHashMap::new));
                pPorUsuario.put(u, map);
            }
            return excelBuilder.buildMultiWithSegmentos(jPorUsuario, vPorUsuario, pPorUsuario, obs, segsByRegistro, LocalDate.now(ZONA_BOGOTA));
        } else {
            return generarExcelForUsuarios(List.of(usuarioId), desde, hasta);
        }
    }

    @Transactional(readOnly = true)
    public byte[] generarExcelForUsuarios(List<UUID> objetivoIds, LocalDate desde, LocalDate hasta) {
        if (objetivoIds == null || objetivoIds.isEmpty()) {
            throw new IllegalArgumentException("Se requiere al menos un usuario");
        }
        if (objetivoIds.size() == 1) {
            UUID uid = objetivoIds.get(0);
            Usuario u = usuarioRepo.findById(uid).orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + uid));
            List<RegistroJornada> jornadas = registroRepo.findByUsuarioIdAndFechaBetweenOrderByFechaAsc(uid, desde, hasta);
            List<Viaje> viajes = viajeRepo.findByUsuarioIdAndFechaBetweenOrderByFechaAsc(uid, desde, hasta);
            Map<LocalDate, Permiso> perms = permisoRepo.findByUsuarioIdAndFechaSolicitudBetween(uid, desde, hasta)
                    .stream().collect(Collectors.toMap(Permiso::getFechaSolicitud, p -> p, (a,b)->a, LinkedHashMap::new));
            Map<UUID, String> obs = buildObservaciones(jornadas);
            Map<UUID, List<SegmentoExtra>> segs = buildSegmentos(jornadas);
            return excelBuilder.buildWithSegmentos(u.getNombre() != null ? u.getNombre() : u.getEmail(), LocalDate.now(ZONA_BOGOTA), jornadas, viajes, perms, obs, segs);
        } else {
            Map<Usuario, List<RegistroJornada>> jPorUsuario = new LinkedHashMap<>();
            Map<Usuario, List<Viaje>> vPorUsuario = new LinkedHashMap<>();
            Map<Usuario, Map<LocalDate, Permiso>> pPorUsuario = new LinkedHashMap<>();
            List<RegistroJornada> todas = new ArrayList<>();
            for (UUID uid : objetivoIds) {
                Usuario u = usuarioRepo.findById(uid).orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + uid));
                List<RegistroJornada> js = registroRepo.findByUsuarioIdAndFechaBetweenOrderByFechaAsc(uid, desde, hasta);
                List<Viaje> vs = viajeRepo.findByUsuarioIdAndFechaBetweenOrderByFechaAsc(uid, desde, hasta);
                jPorUsuario.put(u, js);
                vPorUsuario.put(u, vs);
                Map<LocalDate, Permiso> perms = permisoRepo.findByUsuarioIdAndFechaSolicitudBetween(uid, desde, hasta)
                        .stream().collect(Collectors.toMap(Permiso::getFechaSolicitud, p -> p, (a,b)->a, LinkedHashMap::new));
                pPorUsuario.put(u, perms);
                todas.addAll(js);
            }
            Map<UUID, String> obs = buildObservaciones(todas);
            Map<UUID, List<SegmentoExtra>> segs = buildSegmentos(todas);
            return excelBuilder.buildMultiWithSegmentos(jPorUsuario, vPorUsuario, pPorUsuario, obs, segs, LocalDate.now(ZONA_BOGOTA));
        }
    }

    @Transactional(readOnly = true)
    public byte[] generarExcelOwn(UUID usuarioId, LocalDate desde, LocalDate hasta) {
        return generarExcel(usuarioId, desde, hasta, false);
    }

    private Map<UUID, List<SegmentoExtra>> buildSegmentos(List<RegistroJornada> jornadas) {
        Map<UUID, List<SegmentoExtra>> map = new HashMap<>();
        for (RegistroJornada r : jornadas) {
            if (r.getHoraInicio() == null || r.getHoraFin() == null || r.getId() == null) continue;
            try {
                boolean esDom = esDominicalOFestivo(r.getFecha());
                List<SegmentoExtra> segs = calculadora.calcularSegmentosExtra(r.getHoraInicio(), r.getHoraFin(), esDom);
                map.put(r.getId(), segs);
            } catch (Exception ignored) {}
        }
        return map;
    }

    private boolean esDominicalOFestivo(LocalDate fecha) {
        if (fecha == null) return false;
        boolean esDomingo = fecha.getDayOfWeek() == java.time.DayOfWeek.SUNDAY;
        if (tiempoUtil != null) {
            try { if (tiempoUtil.esFinDeSemana(fecha) && esDomingo) return true; } catch (Exception ignored) {}
        }
        if (esDomingo) return true;
        try { return festivoRepository != null && festivoRepository.existsByFecha(fecha); } catch (Exception e) { return esDomingo; }
    }

    private Map<UUID, String> buildObservaciones(List<RegistroJornada> jornadas) {
        Map<UUID, String> map = new HashMap<>();
        for (RegistroJornada r : jornadas) {
            if (r.getId() == null) continue;
            try {
                var logs = auditRepo.findByEntidadAndEntidadIdOrderByFechaCambioDesc("registro_jornada", r.getId());
                if (!logs.isEmpty() && logs.get(0).getMotivo() != null && !logs.get(0).getMotivo().isBlank()) {
                    map.put(r.getId(), logs.get(0).getMotivo());
                }
            } catch (Exception ignored) {}
        }
        return map;
    }
}
