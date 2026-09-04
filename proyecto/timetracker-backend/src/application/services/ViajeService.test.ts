import { describe, it, expect, vi, type Mock } from "vitest";
import { ViajeService } from "./ViajeService";
import { ViajeRepository } from "../../infrastructure/repositories/ViajeRepository";
import { ConfiguracionRepository } from "../../infrastructure/repositories/ConfiguracionRepository";
import { ViajeProps, NuevoViajeDTO } from "../../domain/entities/ViajeTypes";
import { NoAutorizadoError, NoEncontradoError } from "../../domain/errors/DomainError";

function crearRepos() {
  const viajes = {
    crear: vi.fn(),
    guardar: vi.fn(),
    buscarPorId: vi.fn(),
    eliminar: vi.fn(),
    listarPorRango: vi.fn(),
    listarTodosPorRango: vi.fn(),
  } as unknown as ViajeRepository;

  const configuracion = { obtenerVigente: vi.fn() } as unknown as ConfiguracionRepository;

  return { viajes, configuracion };
}

const DTO_VALIDO: NuevoViajeDTO = {
  fecha: "2026-08-30",
  puntoPartida: "Oficina Bogotá",
  puntoFinal: "Cliente Zona Industrial",
  descripcion: "Visita técnica",
};

function viajeDeEjemplo(overrides: Partial<ViajeProps> = {}): ViajeProps {
  return {
    id: "viaje-1",
    usuarioId: "usuario-1",
    fecha: "2026-08-30",
    puntoPartida: "A",
    puntoFinal: "B",
    descripcion: "motivo",
    valor: 5000,
    ...overrides,
  };
}

describe("ViajeService", () => {
  describe("crear()", () => {
    it("usa el valor de la variable de sistema cuando el DTO no trae valor", async () => {
      const { viajes, configuracion } = crearRepos();
      (configuracion.obtenerVigente as Mock).mockResolvedValue(7000);
      (viajes.crear as Mock).mockImplementation((props) => Promise.resolve(props));
      const service = new ViajeService(viajes, configuracion);

      const resultado = await service.crear("usuario-1", DTO_VALIDO);

      expect(resultado.valor).toBe(7000);
    });

    it("usa 5000 como respaldo si la variable de sistema no está sembrada", async () => {
      const { viajes, configuracion } = crearRepos();
      (configuracion.obtenerVigente as Mock).mockResolvedValue(null);
      (viajes.crear as Mock).mockImplementation((props) => Promise.resolve(props));
      const service = new ViajeService(viajes, configuracion);

      const resultado = await service.crear("usuario-1", DTO_VALIDO);

      expect(resultado.valor).toBe(5000);
    });

    it("respeta el valor explícito del DTO por encima del default", async () => {
      const { viajes, configuracion } = crearRepos();
      (configuracion.obtenerVigente as Mock).mockResolvedValue(5000);
      (viajes.crear as Mock).mockImplementation((props) => Promise.resolve(props));
      const service = new ViajeService(viajes, configuracion);

      const resultado = await service.crear("usuario-1", { ...DTO_VALIDO, valor: 15000 });

      expect(resultado.valor).toBe(15000);
    });
  });

  describe("editar()", () => {
    it("lanza NoEncontradoError si el viaje no existe", async () => {
      const { viajes, configuracion } = crearRepos();
      (viajes.buscarPorId as Mock).mockResolvedValue(null);
      const service = new ViajeService(viajes, configuracion);

      await expect(service.editar("no-existe", "usuario-1", false, DTO_VALIDO)).rejects.toThrow(
        NoEncontradoError
      );
    });

    it("lanza NoAutorizadoError si el viaje es de otro usuario y no es admin", async () => {
      const { viajes, configuracion } = crearRepos();
      (viajes.buscarPorId as Mock).mockResolvedValue(viajeDeEjemplo({ usuarioId: "otro-usuario" }));
      const service = new ViajeService(viajes, configuracion);

      await expect(service.editar("viaje-1", "usuario-1", false, DTO_VALIDO)).rejects.toThrow(
        NoAutorizadoError
      );
    });

    it("un administrador sí puede editar el viaje de otro usuario", async () => {
      const { viajes, configuracion } = crearRepos();
      (viajes.buscarPorId as Mock).mockResolvedValue(viajeDeEjemplo({ usuarioId: "otro-usuario" }));
      (configuracion.obtenerVigente as Mock).mockResolvedValue(5000);
      (viajes.guardar as Mock).mockImplementation((props) => Promise.resolve(props));
      const service = new ViajeService(viajes, configuracion);

      await expect(service.editar("viaje-1", "admin-1", true, DTO_VALIDO)).resolves.toBeDefined();
    });
  });

  describe("eliminar()", () => {
    it("elimina el viaje si pertenece al usuario", async () => {
      const { viajes, configuracion } = crearRepos();
      (viajes.buscarPorId as Mock).mockResolvedValue(viajeDeEjemplo());
      const service = new ViajeService(viajes, configuracion);

      await service.eliminar("viaje-1", "usuario-1", false);

      expect(viajes.eliminar).toHaveBeenCalledWith("viaje-1");
    });

    it("lanza NoAutorizadoError si intenta eliminar el viaje de otro usuario", async () => {
      const { viajes, configuracion } = crearRepos();
      (viajes.buscarPorId as Mock).mockResolvedValue(viajeDeEjemplo({ usuarioId: "otro-usuario" }));
      const service = new ViajeService(viajes, configuracion);

      await expect(service.eliminar("viaje-1", "usuario-1", false)).rejects.toThrow(NoAutorizadoError);
      expect(viajes.eliminar).not.toHaveBeenCalled();
    });
  });
});
