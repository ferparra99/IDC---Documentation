package com.idc.timetracker.modules.trip;

import com.idc.timetracker.common.exception.NoAutorizadoException;
import com.idc.timetracker.common.exception.RecursoNoEncontradoException;
import com.idc.timetracker.common.exception.ValidacionException;
import com.idc.timetracker.modules.systemconfig.SystemConfigService;
import com.idc.timetracker.modules.user.RolUsuario;
import com.idc.timetracker.modules.user.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ViajeService {

    private final ViajeRepository viajeRepo;
    private final UsuarioRepository usuarioRepo;
    private final SystemConfigService configService;

    @Transactional
    public Viaje crear(UUID usuarioId, LocalDate fecha, String puntoPartida, String puntoFinal, String descripcion, BigDecimal valor) {
        if (fecha == null) throw new ValidacionException("fecha requerida");
        if (puntoPartida == null || puntoPartida.isBlank()) throw new ValidacionException("puntoPartida requerido");
        if (puntoFinal == null || puntoFinal.isBlank()) throw new ValidacionException("puntoFinal requerido");
        if (descripcion == null || descripcion.isBlank()) throw new ValidacionException("descripcion requerida");

        var usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
        BigDecimal valorEff = valor != null ? valor : valorPorDefecto();
        Viaje v = Viaje.builder()
                .usuario(usuario)
                .fecha(fecha)
                .puntoPartida(puntoPartida.trim())
                .puntoFinal(puntoFinal.trim())
                .descripcion(descripcion.trim())
                .valor(valorEff)
                .build();
        return viajeRepo.save(v);
    }

    @Transactional(readOnly = true)
    public List<Viaje> listarOwn(UUID usuarioId) {
        return viajeRepo.findByUsuarioIdOrderByFechaDesc(usuarioId);
    }

    @Transactional(readOnly = true)
    public List<Viaje> listarPorRango(UUID usuarioId, LocalDate desde, LocalDate hasta) {
        return viajeRepo.findByUsuarioIdAndFechaBetweenOrderByFechaAsc(usuarioId, desde, hasta);
    }

    @Transactional(readOnly = true)
    public Viaje obtener(UUID solicitanteId, UUID viajeId) {
        Viaje v = viajeRepo.findById(viajeId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Viaje no encontrado"));
        assertOwnOrAdmin(solicitanteId, v);
        return v;
    }

    @Transactional
    public Viaje actualizar(UUID solicitanteId, UUID viajeId, LocalDate fecha, String puntoPartida, String puntoFinal, String descripcion, BigDecimal valor) {
        Viaje v = viajeRepo.findById(viajeId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Viaje no encontrado"));
        assertOwnOrAdmin(solicitanteId, v);
        if (fecha != null) v.setFecha(fecha);
        if (puntoPartida != null && !puntoPartida.isBlank()) v.setPuntoPartida(puntoPartida.trim());
        if (puntoFinal != null && !puntoFinal.isBlank()) v.setPuntoFinal(puntoFinal.trim());
        if (descripcion != null && !descripcion.isBlank()) v.setDescripcion(descripcion.trim());
        if (valor != null) v.setValor(valor);
        return viajeRepo.save(v);
    }

    @Transactional
    public void eliminar(UUID solicitanteId, UUID viajeId) {
        Viaje v = viajeRepo.findById(viajeId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Viaje no encontrado"));
        assertOwnOrAdmin(solicitanteId, v);
        viajeRepo.delete(v);
    }

    private void assertOwnOrAdmin(UUID solicitanteId, Viaje v) {
        if (v.getUsuario().getId().equals(solicitanteId)) return;
        var solicitante = usuarioRepo.findById(solicitanteId).orElse(null);
        if (solicitante != null && solicitante.getRol() == RolUsuario.administrador) return;
        throw new NoAutorizadoException("No autorizado para gestionar este viaje");
    }

    private BigDecimal valorPorDefecto() {
        try {
            Object val = configService.obtenerValor("valorViajePorDefecto");
            if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
            if (val instanceof String s) return new BigDecimal(s);
        } catch (Exception ignored) {}
        return new BigDecimal("5000.00");
    }
}
