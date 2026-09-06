package com.idc.timetracker.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.idc.timetracker.common.security.JwtService;
import com.idc.timetracker.modules.attendance.RegistroJornadaRepository;
import com.idc.timetracker.modules.auth.RefreshTokenRepository;
import com.idc.timetracker.modules.holiday.FestivoRepository;
import com.idc.timetracker.modules.systemconfig.ConfiguracionSistemaRepository;
import com.idc.timetracker.modules.user.RolUsuario;
import com.idc.timetracker.modules.user.Usuario;
import com.idc.timetracker.modules.user.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test de integración que valida que la API Spring replica exactamente
 * los contratos Node definidos en API_CONTRACTS.md.
 * Usa H2 en memoria (application-test.yml: flyway off, ddl create-drop)
 * y DB real sin mocks.
 */
@SpringBootTest
@AutoConfigureMockMvc
@org.springframework.test.context.ActiveProfiles("test")
class ApiContractsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private RegistroJornadaRepository registroJornadaRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired(required = false)
    private FestivoRepository festivoRepository;

    @Autowired(required = false)
    private ConfiguracionSistemaRepository configuracionSistemaRepository;

    @Autowired(required = false)
    private com.idc.timetracker.common.audit.AuditLogRepository auditLogRepository;

    @Autowired(required = false)
    private com.idc.timetracker.modules.trip.ViajeRepository viajeRepository;

    @Autowired(required = false)
    private com.idc.timetracker.modules.leave.PermisoRepository permisoRepository;

    private Usuario admin;
    private Usuario empleado;
    private String adminToken;
    private String empleadoToken;

    private static final String ADMIN_EMAIL = "admin@test.com";
    private static final String EMPLEADO_EMAIL = "empleado@test.com";
    private static final String PASSWORD = "Password123!";

    @BeforeEach
    void setUp() {
        // Limpieza en orden inverso a FKs para evitar violaciones
        try { if (auditLogRepository != null) auditLogRepository.deleteAll(); } catch (Exception ignored) {}
        try { if (viajeRepository != null) viajeRepository.deleteAll(); } catch (Exception ignored) {}
        try { if (permisoRepository != null) permisoRepository.deleteAll(); } catch (Exception ignored) {}
        try { refreshTokenRepository.deleteAll(); } catch (Exception ignored) {}
        try { registroJornadaRepository.deleteAll(); } catch (Exception ignored) {}
        try { if (configuracionSistemaRepository != null) configuracionSistemaRepository.deleteAll(); } catch (Exception ignored) {}
        try { if (festivoRepository != null) festivoRepository.deleteAll(); } catch (Exception ignored) {}
        try { usuarioRepository.deleteAll(); } catch (Exception ignored) {}

        admin = crearUsuario(ADMIN_EMAIL, PASSWORD, "Admin Test", RolUsuario.administrador);
        empleado = crearUsuario(EMPLEADO_EMAIL, PASSWORD, "Empleado Test", RolUsuario.empleado);

        adminToken = jwtService.generarToken(admin.getId().toString(), admin.getRol().name());
        empleadoToken = jwtService.generarToken(empleado.getId().toString(), empleado.getRol().name());
    }

    private Usuario crearUsuario(String email, String rawPassword, String nombre, RolUsuario rol) {
        Usuario u = Usuario.builder()
                .nombre(nombre)
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .rol(rol)
                .activo(true)
                .build();
        return usuarioRepository.save(u);
    }

    // -----------------------------------------------------------------
    // 1) GET /health -> 200 {data:{status:ok}} sin auth
    // -----------------------------------------------------------------
    @Test
    @DisplayName("1) GET /health sin auth -> 200 {data:{status:ok}}")
    void healthSinAuth() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("ok")));
    }

    // -----------------------------------------------------------------
    // 2) POST /api/v1/auth/login con credenciales correctas -> 200 {data:{token, refreshToken, usuario}} y token válido
    // -----------------------------------------------------------------
    @Test
    @DisplayName("2) POST /api/v1/auth/login credenciales correctas -> 200 con token válido")
    void loginCredencialesCorrectas() throws Exception {
        Map<String, String> body = Map.of("email", EMPLEADO_EMAIL, "password", PASSWORD);

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token", not(emptyOrNullString())))
                .andExpect(jsonPath("$.data.refreshToken", not(emptyOrNullString())))
                .andExpect(jsonPath("$.data.usuario.id", not(emptyOrNullString())))
                .andExpect(jsonPath("$.data.usuario.email", is(EMPLEADO_EMAIL)))
                .andReturn();

        String json = result.getResponse().getContentAsString();
        JsonNode data = objectMapper.readTree(json).path("data");
        String token = data.path("token").asText();
        assertNotNull(token);
        assertFalse(token.isBlank());
        // token debe ser verificable y contener el userId del empleado
        var jws = jwtService.verificar(token);
        assertEquals(empleado.getId().toString(), jws.getPayload().getSubject());
    }

    // -----------------------------------------------------------------
    // 3) POST /api/v1/auth/login con credenciales malas -> 401 {error:{code:CREDENCIALES_INVALIDAS}}
    // -----------------------------------------------------------------
    @Test
    @DisplayName("3) POST /api/v1/auth/login credenciales malas -> 401 CREDENCIALES_INVALIDAS")
    void loginCredencialesMalas() throws Exception {
        Map<String, String> body = Map.of("email", EMPLEADO_EMAIL, "password", "WrongPassword999");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code", is("CREDENCIALES_INVALIDAS")));
    }

    // -----------------------------------------------------------------
    // 4) GET /api/v1/attendance/today sin token -> 401/403
    // -----------------------------------------------------------------
    @Test
    @DisplayName("4) GET /api/v1/attendance/today sin token -> 401/403")
    void attendanceTodaySinToken() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/attendance/today"))
                .andReturn();
        int status = result.getResponse().getStatus();
        assertTrue(status == 401 || status == 403,
                "Se esperaba 401 o 403 sin token, pero fue " + status);
    }

    // -----------------------------------------------------------------
    // 5) GET /api/v1/attendance/today con token -> 200 {data:{estado, registro}} (SIN_INICIAR inicialmente)
    // -----------------------------------------------------------------
    @Test
    @DisplayName("5) GET /api/v1/attendance/today con token -> 200 SIN_INICIAR")
    void attendanceTodayConToken() throws Exception {
        MvcResult r = mockMvc.perform(get("/api/v1/attendance/today")
                        .header("Authorization", "Bearer " + empleadoToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.estado", is("SIN_INICIAR")))
                .andReturn();
        JsonNode node = objectMapper.readTree(r.getResponse().getContentAsString());
        assertEquals("SIN_INICIAR", node.path("data").path("estado").asText());
        JsonNode registro = node.path("data").path("registro");
        assertTrue(registro.isNull() || registro.isMissingNode(),
                "registro debe ser null cuando SIN_INICIAR, json=" + node);
    }

    // -----------------------------------------------------------------
    // 6) POST /api/v1/attendance/start -> 201 {data:{id}} y segundo POST /start -> 409 JORNADA_YA_ACTIVA
    // -----------------------------------------------------------------
    @Test
    @DisplayName("6) POST /api/v1/attendance/start -> 201 y segundo -> 409 JORNADA_YA_ACTIVA")
    void attendanceStartYConflicto() throws Exception {
        // primer start debe ser 201 con id
        MvcResult first = mockMvc.perform(post("/api/v1/attendance/start")
                        .header("Authorization", "Bearer " + empleadoToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id", not(emptyOrNullString())))
                .andReturn();

        // Verificar que el id retornado es UUID válido
        JsonNode data = objectMapper.readTree(first.getResponse().getContentAsString()).path("data");
        String id = data.path("id").asText();
        assertNotNull(id);
        assertDoesNotThrow(() -> java.util.UUID.fromString(id));

        // segundo start -> 409
        mockMvc.perform(post("/api/v1/attendance/start")
                        .header("Authorization", "Bearer " + empleadoToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("JORNADA_YA_ACTIVA")));
    }

    // -----------------------------------------------------------------
    // 7) POST /api/v1/attendance/finish sin descripcion -> 422 VALIDACION, y con descripcion -> 200
    // -----------------------------------------------------------------
    @Test
    @DisplayName("7) POST /api/v1/attendance/finish validaciones y éxito")
    void attendanceFinishValidaciones() throws Exception {
        // Necesitamos jornada activa primero
        mockMvc.perform(post("/api/v1/attendance/start")
                        .header("Authorization", "Bearer " + empleadoToken))
                .andExpect(status().isCreated());

        // sin descripcion -> 422 VALIDACION (body vacío o sin campo)
        mockMvc.perform(post("/api/v1/attendance/finish")
                        .header("Authorization", "Bearer " + empleadoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code", is("VALIDACION")));

        // también probar con body null
        mockMvc.perform(post("/api/v1/attendance/finish")
                        .header("Authorization", "Bearer " + empleadoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"descripcionProyectos\":\"\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code", is("VALIDACION")));

        // con descripcion válida -> 200
        Map<String, String> finishBody = Map.of("descripcionProyectos", "Proyecto Facturación (4h), Soporte cliente X (3h)");
        mockMvc.perform(post("/api/v1/attendance/finish")
                        .header("Authorization", "Bearer " + empleadoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(finishBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", not(emptyOrNullString())))
                .andExpect(jsonPath("$.data.estado", is("JORNADA_FINALIZADA")));
    }

    // -----------------------------------------------------------------
    // 8) GET /api/v1/calendar?anio=2026&mes=8 -> 200 {data:[...]}
    // -----------------------------------------------------------------
    @Test
    @DisplayName("8) GET /api/v1/calendar?anio=2026&mes=8 -> 200 data array")
    void calendarMes() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/calendar")
                        .param("anio", "2026")
                        .param("mes", "8")
                        .header("Authorization", "Bearer " + empleadoToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", isA(java.util.List.class)))
                .andExpect(jsonPath("$.data", hasSize(31))) // agosto tiene 31 días
                .andReturn();

        // Validar estructura de un día si no es stub 404
        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        assertTrue(data.isArray());
        assertEquals(31, data.size());
        JsonNode primerDia = data.get(0);
        assertTrue(primerDia.has("fecha"));
        assertTrue(primerDia.has("esFinDeSemana"));
        assertTrue(primerDia.has("esFestivo"));
        assertTrue(primerDia.has("horasTrabajadas"));
    }

    // -----------------------------------------------------------------
    // 9) GET /api/v1/config sin auth -> 401, con auth -> 200
    // -----------------------------------------------------------------
    @Test
    @DisplayName("9) GET /api/v1/config sin y con auth")
    void configSinYConAuth() throws Exception {
        // sin auth -> 401/403
        MvcResult sinAuth = mockMvc.perform(get("/api/v1/config"))
                .andReturn();
        int statusSin = sinAuth.getResponse().getStatus();
        assertTrue(statusSin == 401 || statusSin == 403,
                "Se esperaba 401/403 sin auth para /config, fue " + statusSin);

        // con auth (empleado puede leer, solo PUT requiere admin)
        mockMvc.perform(get("/api/v1/config")
                        .header("Authorization", "Bearer " + empleadoToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", notNullValue()));

        // con admin también 200
        mockMvc.perform(get("/api/v1/config")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", notNullValue()));
    }
}
