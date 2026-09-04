import { describe, it, expect, vi, type Mock } from "vitest";
import { PermisoService } from "./PermisoService";
import { PermisoRepository } from "../../infrastructure/repositories/PermisoRepository";
import { RegistroJornadaRepository } from "../../infrastructure/repositories/RegistroJornadaRepository";
import { UsuarioRepository } from "../../infrastructure/repositories/UsuarioRepository";
import { ConfiguracionRepository } from "../../infrastructure/repositories/ConfiguracionRepository";
import { NuevoPermisoDTO, PermisoProps } from "../../domain/entities/PermisoTypes";
import { RegistroJornadaProps } from "../../domain/entities/RegistroJornadaTypes";
import { NoAutorizadoError, NoEncontradoError, ValidacionError } from "../../domain/errors/DomainError";

function crearRepos() {
  const permisos = {
    crear: vi.fn(),
    guardar: vi.fn(),
    buscarPorId: vi.fn(),
    listarPorUsuario: vi.fn(),
  } as unknown as PermisoRepository;

  const registrosJornada = {
    buscarPorUsuarioYFecha: vi.fn(),
  } as unknown as RegistroJornadaRepository;

  const usuarios = {
    buscarPorId: vi.fn(),
  } as unknown as UsuarioRepository;

  const configuracion = {
    obtenerVigente: vi.fn(),
  } as unknown as ConfiguracionRepository;

  return { permisos, registrosJornada, usuarios, configuracion };
}

const DTO_VALIDO: NuevoPermisoDTO = {
  fechaSolicitud: "2026-09-02",
  horas: 4,
  tipo: "PARCIAL",
  descripcion: "Cita médica",
};

function permisoDeEjemplo(overrides: Partial<PermisoProps> = {}): PermisoProps {
  return {
    id: "permiso-1",
    usuarioId: "usuario-1",
    fechaSolicitud: "2026-09-02",
    horas: 4,
    tipo: "PARCIAL",
    descripcion: "Cita médica",
    estado: "BORRADOR",
    ...overrides,
  };
}

function jornadaDeEjemplo(overrides: Partial<RegistroJornadaProps> = {}): RegistroJornadaProps {
  return {
    id: "registro-1",
    usuarioId: "usuario-1",
    fecha: "2026-09-02",
    horaInicio: new Date("2026-09-02T13:00:00Z"),
    horaFin: new Date("2026-09-02T21:00:00Z"),
    estado: "JORNADA_FINALIZADA",
    descripcionProyectos: "algo",
    horasOrdinarias: 6,
    horasExtraDiurnas: 0,
    horasExtraNocturnas: 0,
    horasRecargoNocturno: 0,
    horasDominicalFestivo: 0,
    editadoManualmente: false,
    ...overrides,
  };
}

describe("PermisoService", () => {
  describe("crear() — sin jornada registrada ese día", () => {
    it("crea el permiso normalmente si no hay jornada ese día", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      (registrosJornada.buscarPorUsuarioYFecha as Mock).mockResolvedValue(null);
      (permisos.crear as Mock).mockImplementation((props) => Promise.resolve({ ...props, id: "nuevo-id" }));
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      const resultado = await service.crear("usuario-1", DTO_VALIDO);

      expect(resultado.id).toBe("nuevo-id");
      expect(resultado.estado).toBe("BORRADOR");
    });
  });

  describe("crear() — regla de interacción con jornada del día (STATE_MACHINE.md 3.5)", () => {
    it("permite un permiso PARCIAL si el día tiene una jornada con 0 horas y no está activa", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      (registrosJornada.buscarPorUsuarioYFecha as Mock).mockResolvedValue(
        jornadaDeEjemplo({ horasOrdinarias: 0, estado: "SIN_INICIAR" })
      );
      (permisos.crear as Mock).mockImplementation((props) => Promise.resolve(props));
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      await expect(service.crear("usuario-1", DTO_VALIDO)).resolves.toBeDefined();
    });

    it("rechaza un permiso COMPLETO si el día ya tiene horas trabajadas", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      (registrosJornada.buscarPorUsuarioYFecha as Mock).mockResolvedValue(jornadaDeEjemplo({ horasOrdinarias: 6 }));
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      await expect(
        service.crear("usuario-1", { ...DTO_VALIDO, tipo: "COMPLETO", horas: 8 })
      ).rejects.toThrow(ValidacionError);
      expect(permisos.crear).not.toHaveBeenCalled();
    });

    it("rechaza un permiso COMPLETO si el día está JORNADA_ACTIVA (aunque horasOrdinarias sea 0 todavía)", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      (registrosJornada.buscarPorUsuarioYFecha as Mock).mockResolvedValue(
        jornadaDeEjemplo({ horasOrdinarias: 0, estado: "JORNADA_ACTIVA" })
      );
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      await expect(
        service.crear("usuario-1", { ...DTO_VALIDO, tipo: "COMPLETO", horas: 8 })
      ).rejects.toThrow(ValidacionError);
    });

    it("rechaza un permiso PARCIAL que excede las horas restantes del día", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      // 6h ya trabajadas, umbral 8h -> quedan 2h disponibles.
      (registrosJornada.buscarPorUsuarioYFecha as Mock).mockResolvedValue(jornadaDeEjemplo({ horasOrdinarias: 6 }));
      (configuracion.obtenerVigente as Mock).mockResolvedValue(8);
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      await expect(service.crear("usuario-1", { ...DTO_VALIDO, tipo: "PARCIAL", horas: 3 })).rejects.toThrow(
        ValidacionError
      );
    });

    it("permite un permiso PARCIAL que cabe exactamente en las horas restantes del día", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      (registrosJornada.buscarPorUsuarioYFecha as Mock).mockResolvedValue(jornadaDeEjemplo({ horasOrdinarias: 6 }));
      (configuracion.obtenerVigente as Mock).mockResolvedValue(8);
      (permisos.crear as Mock).mockImplementation((props) => Promise.resolve(props));
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      await expect(
        service.crear("usuario-1", { ...DTO_VALIDO, tipo: "PARCIAL", horas: 2 })
      ).resolves.toBeDefined();
    });

    it("usa 8h como umbral por defecto si 'horasOrdinariasPorDia' no está configurado", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      (registrosJornada.buscarPorUsuarioYFecha as Mock).mockResolvedValue(jornadaDeEjemplo({ horasOrdinarias: 7 }));
      (configuracion.obtenerVigente as Mock).mockResolvedValue(null);
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      // Quedaría 1h disponible (8 default - 7); pedir 2h debe rechazarse.
      await expect(service.crear("usuario-1", { ...DTO_VALIDO, horas: 2 })).rejects.toThrow(ValidacionError);
    });
  });

  describe("editar()", () => {
    it("re-valida contra la jornada del día al editar", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      (permisos.buscarPorId as Mock).mockResolvedValue(permisoDeEjemplo());
      (registrosJornada.buscarPorUsuarioYFecha as Mock).mockResolvedValue(jornadaDeEjemplo({ horasOrdinarias: 8 }));
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      await expect(
        service.editar("permiso-1", "usuario-1", { ...DTO_VALIDO, tipo: "COMPLETO", horas: 8 })
      ).rejects.toThrow(ValidacionError);
    });

    it("lanza NoAutorizadoError si el permiso es de otro usuario", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      (permisos.buscarPorId as Mock).mockResolvedValue(permisoDeEjemplo({ usuarioId: "otro-usuario" }));
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      await expect(service.editar("permiso-1", "usuario-1", DTO_VALIDO)).rejects.toThrow(NoAutorizadoError);
    });

    it("lanza NoEncontradoError si el permiso no existe", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      (permisos.buscarPorId as Mock).mockResolvedValue(null);
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      await expect(service.editar("no-existe", "usuario-1", DTO_VALIDO)).rejects.toThrow(NoEncontradoError);
    });
  });

  describe("obtenerPreview()", () => {
    it("devuelve el empleado (datos públicos) junto con el permiso", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      (permisos.buscarPorId as Mock).mockResolvedValue(permisoDeEjemplo());
      (usuarios.buscarPorId as Mock).mockResolvedValue({
        id: "usuario-1",
        nombre: "Ana Pérez",
        email: "ana@empresa.com",
        passwordHash: "hash",
        rol: "empleado",
        activo: true,
      });
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      const resultado = await service.obtenerPreview("permiso-1", "usuario-1", false);

      expect(resultado.empleado).toEqual({ id: "usuario-1", nombre: "Ana Pérez", email: "ana@empresa.com", rol: "empleado" });
      expect(resultado.permiso.id).toBe("permiso-1");
    });

    it("un administrador puede previsualizar el permiso de otro usuario", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      (permisos.buscarPorId as Mock).mockResolvedValue(permisoDeEjemplo({ usuarioId: "otro-usuario" }));
      (usuarios.buscarPorId as Mock).mockResolvedValue({
        id: "otro-usuario",
        nombre: "Carlos",
        email: "carlos@empresa.com",
        passwordHash: "hash",
        rol: "empleado",
        activo: true,
      });
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      await expect(service.obtenerPreview("permiso-1", "admin-1", true)).resolves.toBeDefined();
    });
  });

  describe("enviar()", () => {
    it("transiciona el permiso a ENVIADO", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      (permisos.buscarPorId as Mock).mockResolvedValue(permisoDeEjemplo());
      (permisos.guardar as Mock).mockImplementation((props) => Promise.resolve(props));
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      const resultado = await service.enviar("permiso-1", "usuario-1");

      expect(resultado.estado).toBe("ENVIADO");
    });

    it("lanza error de dominio si el permiso ya fue enviado antes", async () => {
      const { permisos, registrosJornada, usuarios, configuracion } = crearRepos();
      (permisos.buscarPorId as Mock).mockResolvedValue(permisoDeEjemplo({ estado: "ENVIADO" }));
      const service = new PermisoService(permisos, registrosJornada, usuarios, configuracion);

      await expect(service.enviar("permiso-1", "usuario-1")).rejects.toThrow();
    });
  });
});
