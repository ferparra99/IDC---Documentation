import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { AttendanceService } from "./AttendanceService";
import { RegistroJornadaRepository } from "../../infrastructure/repositories/RegistroJornadaRepository";
import { ConfiguracionRepository } from "../../infrastructure/repositories/ConfiguracionRepository";
import { AuditLogRepository } from "../../infrastructure/repositories/AuditLogRepository";
import { RegistroJornadaProps } from "../../domain/entities/RegistroJornadaTypes";
import {
  JornadaYaActivaError,
  NoHayJornadaActivaError,
  NoAutorizadoError,
  NoEncontradoError,
  ValidacionError,
} from "../../domain/errors/DomainError";

// Mocks "a mano" tipados con Partial<...> + cast, sin librería adicional de
// mocking: Vitest ya trae vi.fn() con todo lo necesario para esto.
function crearRepos() {
  const registros = {
    buscarPorUsuarioYFecha: vi.fn(),
    buscarActivasPorUsuario: vi.fn(),
    buscarPorId: vi.fn(),
    listarPorRango: vi.fn(),
    crear: vi.fn(),
    guardar: vi.fn(),
  } as unknown as RegistroJornadaRepository;

  const configuracion = {
    obtenerVigente: vi.fn(),
    obtenerTodasVigentes: vi.fn(),
    crearNuevaVersion: vi.fn(),
  } as unknown as ConfiguracionRepository;

  const auditoria = {
    registrar: vi.fn(),
    historialDe: vi.fn(),
  } as unknown as AuditLogRepository;

  return { registros, configuracion, auditoria };
}

function registroFinalizadoDeEjemplo(overrides: Partial<RegistroJornadaProps> = {}): RegistroJornadaProps {
  return {
    id: "registro-1",
    usuarioId: "usuario-1",
    fecha: "2026-08-31",
    horaInicio: new Date("2026-08-31T13:00:00Z"),
    horaFin: new Date("2026-08-31T22:00:00Z"),
    estado: "JORNADA_FINALIZADA",
    descripcionProyectos: "Proyecto X",
    horasOrdinarias: 8,
    horasExtraDiurnas: 1,
    horasExtraNocturnas: 0,
    horasRecargoNocturno: 0,
    horasDominicalFestivo: 0,
    editadoManualmente: false,
    ...overrides,
  };
}

describe("AttendanceService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T13:00:00Z")); // 08:00 Bogotá, lunes
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("obtenerEstadoHoy()", () => {
    it("devuelve SIN_INICIAR si no hay registro para hoy", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      (registros.buscarPorUsuarioYFecha as Mock).mockResolvedValue(null);
      const service = new AttendanceService(registros, configuracion, auditoria);

      const resultado = await service.obtenerEstadoHoy("usuario-1");

      expect(resultado).toEqual({ estado: "SIN_INICIAR", registro: null });
    });

    it("devuelve el estado del registro existente si lo hay", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      const registro = registroFinalizadoDeEjemplo();
      (registros.buscarPorUsuarioYFecha as Mock).mockResolvedValue(registro);
      const service = new AttendanceService(registros, configuracion, auditoria);

      const resultado = await service.obtenerEstadoHoy("usuario-1");

      expect(resultado).toEqual({ estado: "JORNADA_FINALIZADA", registro });
    });
  });

  describe("iniciarJornada()", () => {
    it("crea un registro nuevo cuando no existe ninguno para hoy", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      (registros.buscarPorUsuarioYFecha as Mock).mockResolvedValue(null);
      (configuracion.obtenerVigente as Mock).mockResolvedValue(null); // usa defaults del dominio
      (registros.crear as Mock).mockImplementation((props) => Promise.resolve({ ...props, id: "nuevo-id" }));
      const service = new AttendanceService(registros, configuracion, auditoria);

      const resultado = await service.iniciarJornada("usuario-1");

      expect(resultado.id).toBe("nuevo-id");
      expect(resultado.estado).toBe("JORNADA_ACTIVA");
      expect(registros.crear).toHaveBeenCalledTimes(1);
    });

    it("lanza JornadaYaActivaError si ya existe una jornada activa hoy", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      (registros.buscarPorUsuarioYFecha as Mock).mockResolvedValue(
        registroFinalizadoDeEjemplo({ estado: "JORNADA_ACTIVA" })
      );
      const service = new AttendanceService(registros, configuracion, auditoria);

      await expect(service.iniciarJornada("usuario-1")).rejects.toThrow(JornadaYaActivaError);
      expect(registros.crear).not.toHaveBeenCalled();
    });

    it("lanza JornadaYaActivaError si ya existe una jornada finalizada hoy", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      (registros.buscarPorUsuarioYFecha as Mock).mockResolvedValue(registroFinalizadoDeEjemplo());
      const service = new AttendanceService(registros, configuracion, auditoria);

      await expect(service.iniciarJornada("usuario-1")).rejects.toThrow(JornadaYaActivaError);
    });
  });

  describe("finalizarJornada()", () => {
    it("lanza NoHayJornadaActivaError si no hay ninguna jornada activa", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      (registros.buscarActivasPorUsuario as Mock).mockResolvedValue([]);
      const service = new AttendanceService(registros, configuracion, auditoria);

      await expect(service.finalizarJornada("usuario-1", "desc")).rejects.toThrow(NoHayJornadaActivaError);
    });

    it("finaliza la jornada activa y calcula horas", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      const activa = registroFinalizadoDeEjemplo({
        estado: "JORNADA_ACTIVA",
        horaFin: null,
        horasOrdinarias: 0,
        horasExtraDiurnas: 0,
      });
      (registros.buscarActivasPorUsuario as Mock).mockResolvedValue([activa]);
      (configuracion.obtenerVigente as Mock).mockResolvedValue(null);
      (registros.guardar as Mock).mockImplementation((props) => Promise.resolve(props));
      const service = new AttendanceService(registros, configuracion, auditoria);

      // Avanzamos el reloj para que finalizar() no coincida con horaInicio.
      vi.setSystemTime(new Date("2026-08-31T22:00:00Z"));
      const resultado = await service.finalizarJornada("usuario-1", "Trabajo del día");

      expect(resultado.estado).toBe("JORNADA_FINALIZADA");
      expect(resultado.descripcionProyectos).toBe("Trabajo del día");
    });

    it("si hay varias jornadas activas, cierra la más antigua (FIFO)", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      const masAntigua = registroFinalizadoDeEjemplo({
        id: "antigua",
        fecha: "2026-08-29",
        estado: "JORNADA_ACTIVA",
        horaInicio: new Date("2026-08-29T13:00:00Z"),
        horaFin: null,
      });
      const masReciente = registroFinalizadoDeEjemplo({
        id: "reciente",
        fecha: "2026-08-30",
        estado: "JORNADA_ACTIVA",
        horaInicio: new Date("2026-08-30T13:00:00Z"),
        horaFin: null,
      });
      // El repositorio ya se documenta como "ORDER BY fecha ASC", así que el mock refleja ese orden.
      (registros.buscarActivasPorUsuario as Mock).mockResolvedValue([masAntigua, masReciente]);
      (configuracion.obtenerVigente as Mock).mockResolvedValue(null);
      (registros.guardar as Mock).mockImplementation((props) => Promise.resolve(props));
      const service = new AttendanceService(registros, configuracion, auditoria);

      const resultado = await service.finalizarJornada("usuario-1", "cierre");

      expect(resultado.id).toBe("antigua");
    });
  });

  describe("editarManual()", () => {
    const paramsBase = {
      registroId: "registro-1",
      horaInicio: new Date("2026-08-31T13:00:00Z"),
      horaFin: new Date("2026-08-31T22:00:00Z"),
      motivo: "Olvidó fichar la hora exacta",
      solicitanteId: "usuario-1",
      solicitanteEsAdmin: false,
    };

    it("lanza ValidacionError si falta el motivo", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      const service = new AttendanceService(registros, configuracion, auditoria);
      await expect(service.editarManual({ ...paramsBase, motivo: "" })).rejects.toThrow(ValidacionError);
    });

    it("lanza ValidacionError si horaFin no es posterior a horaInicio", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      const service = new AttendanceService(registros, configuracion, auditoria);
      await expect(
        service.editarManual({ ...paramsBase, horaFin: paramsBase.horaInicio })
      ).rejects.toThrow(ValidacionError);
    });

    it("lanza NoEncontradoError si el registro no existe", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      (registros.buscarPorId as Mock).mockResolvedValue(null);
      const service = new AttendanceService(registros, configuracion, auditoria);
      await expect(service.editarManual(paramsBase)).rejects.toThrow(NoEncontradoError);
    });

    it("lanza NoAutorizadoError si el registro es de otro usuario y no es admin", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      (registros.buscarPorId as Mock).mockResolvedValue(registroFinalizadoDeEjemplo({ usuarioId: "otro-usuario" }));
      const service = new AttendanceService(registros, configuracion, auditoria);
      await expect(service.editarManual(paramsBase)).rejects.toThrow(NoAutorizadoError);
    });

    it("un administrador SÍ puede editar el registro de otro usuario", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      (registros.buscarPorId as Mock).mockResolvedValue(registroFinalizadoDeEjemplo({ usuarioId: "otro-usuario" }));
      (configuracion.obtenerVigente as Mock).mockResolvedValue(null);
      (registros.guardar as Mock).mockImplementation((props) => Promise.resolve(props));
      const service = new AttendanceService(registros, configuracion, auditoria);

      await expect(
        service.editarManual({ ...paramsBase, solicitanteEsAdmin: true })
      ).resolves.toBeDefined();
    });

    it("registra la edición en audit_log con valor anterior y nuevo", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      const existente = registroFinalizadoDeEjemplo();
      // Instantánea ANTES de llamar al servicio: RegistroJornada muta `props`
      // por referencia (ver src/domain/entities/RegistroJornada.ts), así que
      // comparar contra `existente` después de la llamada compararía contra
      // un objeto ya modificado, no contra el estado previo real.
      const snapshotAntesDeEditar = { ...existente };
      (registros.buscarPorId as Mock).mockResolvedValue(existente);
      (configuracion.obtenerVigente as Mock).mockResolvedValue(null);
      (registros.guardar as Mock).mockImplementation((props) => Promise.resolve(props));
      const service = new AttendanceService(registros, configuracion, auditoria);

      await service.editarManual(paramsBase);

      expect(auditoria.registrar).toHaveBeenCalledTimes(1);
      const llamada = (auditoria.registrar as Mock).mock.calls[0][0];
      expect(llamada.entidad).toBe("registro_jornada");
      expect(llamada.motivo).toBe(paramsBase.motivo);
      expect(llamada.valorAnterior).toEqual(snapshotAntesDeEditar);
    });
  });

  describe("resumenSemanal()", () => {
    it("calcula horas trabajadas, extra y faltantes correctamente", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      (registros.listarPorRango as Mock).mockResolvedValue([
        registroFinalizadoDeEjemplo({ horasOrdinarias: 8, horasExtraDiurnas: 1 }),
        registroFinalizadoDeEjemplo({ horasOrdinarias: 8, horasExtraDiurnas: 0, horasExtraNocturnas: 2 }),
      ]);
      (configuracion.obtenerVigente as Mock).mockResolvedValue(42);
      const service = new AttendanceService(registros, configuracion, auditoria);

      const resumen = await service.resumenSemanal("usuario-1", "2026-08-24", "2026-08-30");

      expect(resumen.horasTrabajadas).toBe(19); // 8+1+8+2
      expect(resumen.horasExtra).toBe(3); // 1+2
      expect(resumen.horasMinimasSemanales).toBe(42);
      expect(resumen.horasFaltantes).toBe(23); // 42-19
    });

    it("usa 42 como default si la variable de configuración no está sembrada", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      (registros.listarPorRango as Mock).mockResolvedValue([]);
      (configuracion.obtenerVigente as Mock).mockResolvedValue(null);
      const service = new AttendanceService(registros, configuracion, auditoria);

      const resumen = await service.resumenSemanal("usuario-1", "2026-08-24", "2026-08-30");

      expect(resumen.horasMinimasSemanales).toBe(42);
      expect(resumen.horasFaltantes).toBe(42);
    });

    it("horasFaltantes nunca es negativo aunque se trabajen más horas que el mínimo", async () => {
      const { registros, configuracion, auditoria } = crearRepos();
      (registros.listarPorRango as Mock).mockResolvedValue([
        registroFinalizadoDeEjemplo({ horasOrdinarias: 50 }),
      ]);
      (configuracion.obtenerVigente as Mock).mockResolvedValue(42);
      const service = new AttendanceService(registros, configuracion, auditoria);

      const resumen = await service.resumenSemanal("usuario-1", "2026-08-24", "2026-08-30");

      expect(resumen.horasFaltantes).toBe(0);
    });
  });
});
