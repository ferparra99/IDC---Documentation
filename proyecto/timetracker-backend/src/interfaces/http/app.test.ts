import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { env } from "../../shared/config/env";
import {
  CredencialesInvalidasError,
  JornadaYaActivaError,
  ValidacionError,
} from "../../domain/errors/DomainError";

// Se mockea el composition root completo: las pruebas de integración HTTP
// verifican el "cableado" (rutas -> middlewares -> controladores -> respuesta
// JSON/status), no la lógica de negocio en sí (eso ya está cubierto a fondo
// en domain/*.test.ts y application/*.test.ts con sus propios mocks). Así
// esta suite corre sin PostgreSQL real y en milisegundos.
vi.mock("./container", () => ({
  container: {
    authService: { login: vi.fn() },
    configService: { obtenerVigentes: vi.fn(), actualizar: vi.fn() },
    attendanceService: {
      obtenerEstadoHoy: vi.fn(),
      iniciarJornada: vi.fn(),
      finalizarJornada: vi.fn(),
      editarManual: vi.fn(),
      listar: vi.fn(),
      resumenSemanal: vi.fn(),
    },
    calendarService: { obtenerMes: vi.fn() },
    permisoService: { crear: vi.fn(), editar: vi.fn(), obtenerPreview: vi.fn(), enviar: vi.fn(), listar: vi.fn() },
    viajeService: { crear: vi.fn(), editar: vi.fn(), eliminar: vi.fn(), listar: vi.fn() },
    reportService: { generarExcel: vi.fn() },
    holidaySyncService: { asegurarAnioSincronizado: vi.fn() },
  },
}));

// Import diferido: debe ocurrir DESPUÉS de vi.mock (hoisted por Vitest) para
// que crearApp() reciba el container ya mockeado.
const { crearApp } = await import("./app");
const { container } = await import("./container");

const app = crearApp();

function tokenValido(rol: "empleado" | "administrador" = "empleado", sub = "usuario-1") {
  return jwt.sign({ sub, rol }, env.jwtSecret);
}

// A nivel de archivo, no solo dentro de un describe puntual: cada test debe
// empezar con el historial de llamadas de los mocks limpio, o una aserción
// "not.toHaveBeenCalled()" puede fallar por una llamada de un test anterior,
// no por el comportamiento real del request que se está probando.
beforeEach(() => vi.clearAllMocks());

describe("HTTP: /health", () => {
  it("responde 200 sin autenticación", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: "ok" } });
  });
});

describe("HTTP: rutas no existentes", () => {
  it("responde 404 con formato de error consistente", async () => {
    const res = await request(app).get("/api/v1/no-existe");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("RUTA_NO_ENCONTRADA");
  });
});

describe("HTTP: POST /api/v1/auth/login", () => {
  it("200 con credenciales correctas", async () => {
    (container.authService.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: "jwt-simulado",
      refreshToken: "refresh-simulado",
      usuario: { id: "usuario-1", nombre: "Ana", email: "ana@empresa.com", rol: "empleado" },
    });

    const res = await request(app).post("/api/v1/auth/login").send({ email: "ana@empresa.com", password: "clave" });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBe("jwt-simulado");
  });

  it("422 si falta 'password' en el body", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "ana@empresa.com" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDACION");
    expect(container.authService.login).not.toHaveBeenCalled();
  });

  it("401 con credenciales incorrectas (el servicio lanza CredencialesInvalidasError)", async () => {
    (container.authService.login as ReturnType<typeof vi.fn>).mockRejectedValue(
      new CredencialesInvalidasError("Email o contraseña incorrectos.")
    );

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "ana@empresa.com", password: "incorrecta" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("CREDENCIALES_INVALIDAS");
  });
});

describe("HTTP: rutas protegidas requieren autenticación", () => {
  it("GET /api/v1/attendance/today sin header Authorization -> 401", async () => {
    const res = await request(app).get("/api/v1/attendance/today");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("NO_AUTENTICADO");
  });

  it("GET /api/v1/attendance/today con token válido -> 200", async () => {
    (container.attendanceService.obtenerEstadoHoy as ReturnType<typeof vi.fn>).mockResolvedValue({
      estado: "SIN_INICIAR",
      registro: null,
    });

    const res = await request(app)
      .get("/api/v1/attendance/today")
      .set("Authorization", `Bearer ${tokenValido()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe("SIN_INICIAR");
  });
});

describe("HTTP: mapeo de errores de dominio a status HTTP", () => {
  it("POST /api/v1/attendance/start -> 409 si el servicio lanza JornadaYaActivaError", async () => {
    (container.attendanceService.iniciarJornada as ReturnType<typeof vi.fn>).mockRejectedValue(
      new JornadaYaActivaError("Ya tienes una jornada activa.")
    );

    const res = await request(app)
      .post("/api/v1/attendance/start")
      .set("Authorization", `Bearer ${tokenValido()}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("JORNADA_YA_ACTIVA");
  });

  it("POST /api/v1/attendance/finish -> 422 si falta 'descripcionProyectos'", async () => {
    const res = await request(app)
      .post("/api/v1/attendance/finish")
      .set("Authorization", `Bearer ${tokenValido()}`)
      .send({});

    expect(res.status).toBe(422);
    expect(container.attendanceService.finalizarJornada).not.toHaveBeenCalled();
  });
});

describe("HTTP: control de acceso por rol (requiereRol)", () => {
  it("PUT /api/v1/config/:clave con rol 'empleado' -> 403", async () => {
    const res = await request(app)
      .put("/api/v1/config/horasMinimasSemanales")
      .set("Authorization", `Bearer ${tokenValido("empleado")}`)
      .send({ valor: 40, vigenteDesde: "2026-09-01" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("NO_AUTORIZADO");
    expect(container.configService.actualizar).not.toHaveBeenCalled();
  });

  it("PUT /api/v1/config/:clave con rol 'administrador' -> 200", async () => {
    (container.configService.actualizar as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await request(app)
      .put("/api/v1/config/horasMinimasSemanales")
      .set("Authorization", `Bearer ${tokenValido("administrador")}`)
      .send({ valor: 40, vigenteDesde: "2026-09-01" });

    expect(res.status).toBe(200);
    expect(container.configService.actualizar).toHaveBeenCalledWith(
      "horasMinimasSemanales",
      40,
      "2026-09-01",
      "usuario-1"
    );
  });
});

describe("HTTP: descarga de reporte Excel", () => {
  it("GET /api/v1/reports/excel devuelve bytes con el content-type correcto", async () => {
    (container.reportService.generarExcel as ReturnType<typeof vi.fn>).mockResolvedValue(
      Buffer.from("contenido-xlsx-simulado")
    );

    const res = await request(app)
      .get("/api/v1/reports/excel?desde=2026-08-01&hasta=2026-08-31")
      .set("Authorization", `Bearer ${tokenValido()}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("spreadsheetml");
    expect(res.headers["content-disposition"]).toContain("reporte_2026-08-01_a_2026-08-31.xlsx");
  });

  it("un empleado no puede pedir el reporte de otro usuarioId", async () => {
    const res = await request(app)
      .get("/api/v1/reports/excel?desde=2026-08-01&hasta=2026-08-31&usuarioId=otro-usuario")
      .set("Authorization", `Bearer ${tokenValido("empleado", "usuario-1")}`);

    expect(res.status).toBe(403);
    expect(container.reportService.generarExcel).not.toHaveBeenCalled();
  });
});
