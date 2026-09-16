package com.idc.timetracker.modules.attendance;

import com.idc.timetracker.common.exception.NoAutorizadoException;
import com.idc.timetracker.common.exception.ValidacionException;
import com.idc.timetracker.modules.attendance.dto.AttendanceMapper;
import com.idc.timetracker.modules.attendance.dto.RegistroDTO;
import com.idc.timetracker.modules.systemconfig.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService service;
    private final AttendanceMapper mapper;
    private final SystemConfigService configService;

    private UUID toUUID(String userId) {
        return UUID.fromString(userId);
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equalsIgnoreCase("ROLE_administrador")
                        || a.getAuthority().equalsIgnoreCase("administrador")
                        || a.getAuthority().equalsIgnoreCase("ROLE_ADMIN")
        );
    }

    private UUID usuarioEfectivo(String solicitado, String actual) {
        String eff = (solicitado != null && !solicitado.isBlank()) ? solicitado : actual;
        if (!eff.equals(actual) && !isAdmin()) {
            throw new NoAutorizadoException("No puedes consultar información de otro usuario.");
        }
        return UUID.fromString(eff);
    }

    @GetMapping("/today")
    public ResponseEntity<Map<String, Object>> today(@AuthenticationPrincipal String userId) {
        UUID uid = toUUID(userId);
        RegistroJornada registro = service.obtenerRegistroHoy(uid);
        EstadoJornada estado = service.obtenerEstadoHoy(uid);
        if (registro != null) {
            estado = registro.getEstado();
        }
        RegistroDTO dto = mapper.toDTO(registro);
        java.util.HashMap<String, Object> payload = new java.util.HashMap<>();
        payload.put("estado", estado.name());
        payload.put("registro", dto);
        return ResponseEntity.ok(Map.of("data", payload));
    }

    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> start(@AuthenticationPrincipal String userId) {
        UUID uid = toUUID(userId);
        RegistroJornada creado = service.iniciarJornada(uid);
        RegistroDTO dto = mapper.toDTO(creado);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", dto));
    }

    @PostMapping("/finish")
    public ResponseEntity<Map<String, Object>> finish(@AuthenticationPrincipal String userId,
                                                      @RequestBody(required = false) Map<String, String> body) {
        String descripcion = body != null ? body.get("descripcionProyectos") : null;
        if (descripcion == null || descripcion.isBlank()) {
            throw new ValidacionException("El campo 'descripcionProyectos' es obligatorio para finalizar la jornada.");
        }
        UUID uid = toUUID(userId);
        RegistroJornada actualizado = service.finalizarJornada(uid, descripcion);
        RegistroDTO dto = mapper.toDTO(actualizado);
        return ResponseEntity.ok(Map.of("data", dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> editar(@AuthenticationPrincipal String userId,
                                                      @PathVariable UUID id,
                                                      @RequestBody Map<String, String> body) {
        String horaInicioStr = body != null ? body.get("horaInicio") : null;
        String horaFinStr = body != null ? body.get("horaFin") : null;
        String motivo = body != null ? body.get("motivo") : null;
        if (horaInicioStr == null || horaFinStr == null || motivo == null || motivo.isBlank()) {
            throw new ValidacionException("Los campos 'horaInicio', 'horaFin' y 'motivo' son obligatorios.");
        }
        Instant horaInicio;
        Instant horaFin;
        try {
            horaInicio = Instant.parse(horaInicioStr);
            horaFin = Instant.parse(horaFinStr);
        } catch (Exception e) {
            throw new ValidacionException("Formato de fecha inválido, se espera ISO8601 (Instant).");
        }
        UUID uid = toUUID(userId);
        RegistroJornada resultado = service.editarManual(uid, id, horaInicio, horaFin, motivo);
        RegistroDTO dto = mapper.toDTO(resultado);
        return ResponseEntity.ok(Map.of("data", dto));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listar(@AuthenticationPrincipal String userId,
                                                      @RequestParam String desde,
                                                      @RequestParam String hasta,
                                                      @RequestParam(required = false) String usuarioId) {
        if (desde == null || hasta == null) {
            throw new ValidacionException("Los parámetros 'desde' y 'hasta' (YYYY-MM-DD) son obligatorios.");
        }
        UUID efectivo = usuarioEfectivo(usuarioId, userId);
        LocalDate d = LocalDate.parse(desde);
        LocalDate h = LocalDate.parse(hasta);
        List<RegistroJornada> registros = service.listar(efectivo, d, h);
        List<RegistroDTO> dtos = registros.stream().map(mapper::toDTO).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("data", dtos));
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary(@AuthenticationPrincipal String userId,
                                                       @RequestParam String desde,
                                                       @RequestParam String hasta,
                                                       @RequestParam(required = false) String usuarioId) {
        if (desde == null || hasta == null) {
            throw new ValidacionException("Los parámetros 'desde' y 'hasta' (YYYY-MM-DD, lunes a domingo) son obligatorios.");
        }
        UUID efectivo = usuarioEfectivo(usuarioId, userId);
        LocalDate d = LocalDate.parse(desde);
        LocalDate h = LocalDate.parse(hasta);
        List<RegistroJornada> registros = service.listar(efectivo, d, h);

        BigDecimal horasMinimasSemanales = BigDecimal.valueOf(42);
        try {
            Object v = configService.obtenerValor("horasMinimasSemanales");
            if (v instanceof Number n) horasMinimasSemanales = BigDecimal.valueOf(n.doubleValue());
            else if (v instanceof String s) horasMinimasSemanales = new BigDecimal(s);
        } catch (Exception ignored) {}

        BigDecimal horasTrabajadas = BigDecimal.ZERO;
        BigDecimal horasExtra = BigDecimal.ZERO;
        for (RegistroJornada r : registros) {
            BigDecimal total = BigDecimal.ZERO;
            if (r.getHorasOrdinarias() != null) total = total.add(r.getHorasOrdinarias());
            if (r.getHorasExtraDiurnas() != null) total = total.add(r.getHorasExtraDiurnas());
            if (r.getHorasExtraNocturnas() != null) total = total.add(r.getHorasExtraNocturnas());
            if (r.getHorasRecargoNocturno() != null) total = total.add(r.getHorasRecargoNocturno());
            if (r.getHorasDominicalFestivo() != null) total = total.add(r.getHorasDominicalFestivo());
            horasTrabajadas = horasTrabajadas.add(total);
            BigDecimal extra = BigDecimal.ZERO;
            if (r.getHorasExtraDiurnas() != null) extra = extra.add(r.getHorasExtraDiurnas());
            if (r.getHorasExtraNocturnas() != null) extra = extra.add(r.getHorasExtraNocturnas());
            horasExtra = horasExtra.add(extra);
        }
        horasTrabajadas = horasTrabajadas.setScale(2, RoundingMode.HALF_UP);
        horasExtra = horasExtra.setScale(2, RoundingMode.HALF_UP);
        horasMinimasSemanales = horasMinimasSemanales.setScale(2, RoundingMode.HALF_UP);
        BigDecimal horasFaltantes = horasMinimasSemanales.subtract(horasTrabajadas).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> resumen = Map.of(
                "horasTrabajadas", horasTrabajadas.doubleValue(),
                "horasMinimasSemanales", horasMinimasSemanales.doubleValue(),
                "horasExtra", horasExtra.doubleValue(),
                "horasFaltantes", horasFaltantes.doubleValue()
        );
        return ResponseEntity.ok(Map.of("data", resumen));
    }
}
