package com.idc.timetracker.modules.auth;

import com.idc.timetracker.common.config.AppProperties;
import com.idc.timetracker.common.security.JwtService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService svc() {
        AppProperties props = new AppProperties();
        props.getJwt().setSecret("test-secret-key-para-tests-muy-largo-32-chars-minimo-123456");
        props.getJwt().setExpiresIn("1h");
        return new JwtService(props);
    }

    @Test
    void generaYVerifica() {
        var svc = svc();
        String token = svc.generarToken("user-123", "empleado");
        assertNotNull(token);
        var jws = svc.verificar(token);
        assertEquals("user-123", jws.getPayload().getSubject());
        assertEquals("empleado", jws.getPayload().get("rol", String.class));
    }

    @Test
    void distintosUsuariosDistintosTokens() {
        var svc = svc();
        String t1 = svc.generarToken("a", "empleado");
        String t2 = svc.generarToken("b", "empleado");
        assertNotEquals(t1, t2);
    }

    @Test
    void tokenInvalidoLanza() {
        var svc = svc();
        assertThrows(Exception.class, () -> svc.verificar("invalid.token.here"));
    }
}
