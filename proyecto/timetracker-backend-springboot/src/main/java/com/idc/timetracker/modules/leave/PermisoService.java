package com.idc.timetracker.modules.leave;

import com.idc.timetracker.common.exception.NoAutorizadoException;
import com.idc.timetracker.common.exception.RecursoNoEncontradoException;
import com.idc.timetracker.common.exception.ValidacionException;
import com.idc.timetracker.modules.attendance.RegistroJornada;
import com.idc.timetracker.modules.attendance.RegistroJornadaRepository;
import com.idc.timetracker.modules.systemconfig.SystemConfigService;
import com.idc.timetracker.modules.user.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PermisoService {

    private final PermisoRepository permisoRepo;
    private final UsuarioRepository usuarioRepo;
    private final RegistroJornadaRepository jornadaRepo;
    private final SystemConfigService configService;

    @Transactional
    public Permiso crear(UUID usuarioId, LocalDate fechaSolicitud, BigDecimal horas, TipoPermiso tipo, String descripcion) {
        validarHoras(horas);
        if (fechaSolicitud == null) throw new ValidacionException("fechaSolicitud requerida");
        if (tipo == null) throw new ValidacionException("tipo requerido");
        if (descripcion == null || descripcion.isBlank()) throw new ValidacionException("descripcion requerida");
        validarDisponibilidad(usuarioId, fechaSolicitud, horas, tipo);

        var usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
        Permiso p = Permiso.builder()
                .usuario(usuario)
                .fechaSolicitud(fechaSolicitud)
                .horas(horas.setScale(2, RoundingMode.HALF_UP))
                .tipo(tipo)
                .descripcion(descripcion.trim())
                .estado(EstadoPermiso.BORRADOR)
                .build();
        return permisoRepo.save(p);
    }

    @Transactional
    public Permiso editar(UUID usuarioId, UUID permisoId, LocalDate fechaSolicitud, BigDecimal horas, TipoPermiso tipo, String descripcion) {
        Permiso p = permisoRepo.findById(permisoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Permiso no encontrado"));
        if (!p.getUsuario().getId().equals(usuarioId)) throw new NoAutorizadoException("No autorizado");
        if (p.getEstado() == EstadoPermiso.ENVIADO) throw new ValidacionException("No se puede editar un permiso ya enviado");
        if (horas != null) validarHoras(horas);
        BigDecimal horasEff = horas != null ? horas : p.getHoras();
        TipoPermiso tipoEff = tipo != null ? tipo : p.getTipo();
        LocalDate fechaEff = fechaSolicitud != null ? fechaSolicitud : p.getFechaSolicitud();
        validarDisponibilidad(usuarioId, fechaEff, horasEff, tipoEff);
        if (fechaSolicitud != null) p.setFechaSolicitud(fechaSolicitud);
        if (horas != null) p.setHoras(horas.setScale(2, RoundingMode.HALF_UP));
        if (tipo != null) p.setTipo(tipo);
        if (descripcion != null && !descripcion.isBlank()) p.setDescripcion(descripcion.trim());
        return permisoRepo.save(p);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> preview(UUID usuarioId, LocalDate fechaSolicitud, BigDecimal horas, TipoPermiso tipo) {
        validarHoras(horas);
        BigDecimal horasRegistradas = horasRegistradas(usuarioId, fechaSolicitud);
        BigDecimal ordinariasPorDia = horasOrdinariasPorDia();
        BigDecimal disponible = ordinariasPorDia.subtract(horasRegistradas).max(BigDecimal.ZERO);
        boolean puedeParcial = tipo == TipoPermiso.PARCIAL && horas.compareTo(disponible) <= 0;
        boolean puedeCompleto = tipo == TipoPermiso.COMPLETO && horasRegistradas.compareTo(BigDecimal.ZERO) == 0;
        boolean valido = tipo == TipoPermiso.PARCIAL ? puedeParcial : puedeCompleto;
        return Map.of(
                "horasRegistradas", horasRegistradas,
                "horasOrdinariasPorDia", ordinariasPorDia,
                "disponible", disponible,
                "valido", valido
        );
    }

    @Transactional
    public Permiso enviar(UUID usuarioId, UUID permisoId) {
        Permiso p = permisoRepo.findById(permisoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Permiso no encontrado"));
        if (!p.getUsuario().getId().equals(usuarioId)) throw new NoAutorizadoException("No autorizado");
        if (p.getEstado() == EstadoPermiso.ENVIADO) throw new ValidacionException("Ya enviado");
        validarDisponibilidad(usuarioId, p.getFechaSolicitud(), p.getHoras(), p.getTipo());
        p.setEstado(EstadoPermiso.ENVIADO);
        return permisoRepo.save(p);
    }

    @Transactional(readOnly = true)
    public List<Permiso> listar(UUID usuarioId) {
        return permisoRepo.findByUsuarioIdOrderByFechaSolicitudDesc(usuarioId);
    }

    @Transactional(readOnly = true)
    public Permiso obtener(UUID usuarioId, UUID permisoId) {
        Permiso p = permisoRepo.findById(permisoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Permiso no encontrado"));
        if (!p.getUsuario().getId().equals(usuarioId)) throw new NoAutorizadoException("No autorizado");
        return p;
    }

    private void validarHoras(BigDecimal horas) {
        if (horas == null || horas.compareTo(BigDecimal.ZERO) <= 0) throw new ValidacionException("horas debe ser > 0");
    }

    private void validarDisponibilidad(UUID usuarioId, LocalDate fecha, BigDecimal horas, TipoPermiso tipo) {
        BigDecimal registradas = horasRegistradas(usuarioId, fecha);
        if (tipo == TipoPermiso.COMPLETO) {
            if (registradas.compareTo(BigDecimal.ZERO) > 0) {
                throw new ValidacionException("Permiso COMPLETO rechazado: ya existe jornada con horas ese día");
            }
        } else if (tipo == TipoPermiso.PARCIAL) {
            BigDecimal ordinariasPorDia = horasOrdinariasPorDia();
            BigDecimal disponible = ordinariasPorDia.subtract(registradas);
            if (horas.compareTo(disponible) > 0) {
                throw new ValidacionException("Permiso PARCIAL rechazado: excede horas disponibles (" + disponible + "h)");
            }
        }
    }

    private BigDecimal horasRegistradas(UUID usuarioId, LocalDate fecha) {
        return jornadaRepo.findByUsuarioIdAndFecha(usuarioId, fecha)
                .map(this::sumHoras)
                .orElse(BigDecimal.ZERO);
    }

    private BigDecimal sumHoras(RegistroJornada r) {
        BigDecimal t = BigDecimal.ZERO;
        if (r.getHorasOrdinarias() != null) t = t.add(r.getHorasOrdinarias());
        if (r.getHorasExtraDiurnas() != null) t = t.add(r.getHorasExtraDiurnas());
        if (r.getHorasExtraNocturnas() != null) t = t.add(r.getHorasExtraNocturnas());
        if (r.getHorasRecargoNocturno() != null) t = t.add(r.getHorasRecargoNocturno());
        if (r.getHorasDominicalFestivo() != null) t = t.add(r.getHorasDominicalFestivo());
        return t;
    }

    private BigDecimal horasOrdinariasPorDia() {
        try {
            Object v = configService.obtenerValor("horasOrdinariasPorDia");
            if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
            if (v instanceof String s) return new BigDecimal(s);
        } catch (Exception ignored) {}
        return BigDecimal.valueOf(8);
    }
}
