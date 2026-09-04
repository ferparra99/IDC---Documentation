import { describe, it, expect, vi, type Mock } from "vitest";
import { ConfigService } from "./ConfigService";
import { ConfiguracionRepository } from "../../infrastructure/repositories/ConfiguracionRepository";
import { ValidacionError } from "../../domain/errors/DomainError";

function crearRepo() {
  return {
    obtenerTodasVigentes: vi.fn(),
    obtenerVigente: vi.fn(),
    crearNuevaVersion: vi.fn(),
  } as unknown as ConfiguracionRepository;
}

describe("ConfigService", () => {
  describe("obtenerVigentes()", () => {
    it("delega directamente en el repositorio", async () => {
      const repo = crearRepo();
      (repo.obtenerTodasVigentes as Mock).mockResolvedValue([{ clave: "x", valor: 1, vigenteDesde: "2026-01-01" }]);
      const service = new ConfigService(repo);

      const resultado = await service.obtenerVigentes();

      expect(resultado).toHaveLength(1);
    });
  });

  describe("actualizar()", () => {
    it("crea una nueva versión con datos válidos", async () => {
      const repo = crearRepo();
      const service = new ConfigService(repo);

      await service.actualizar("horasMinimasSemanales", 42, "2026-09-01", "admin-1");

      expect(repo.crearNuevaVersion).toHaveBeenCalledWith("horasMinimasSemanales", 42, "2026-09-01", "admin-1");
    });

    it("lanza ValidacionError si 'valor' es undefined", async () => {
      const repo = crearRepo();
      const service = new ConfigService(repo);

      await expect(service.actualizar("clave", undefined, "2026-09-01", "admin-1")).rejects.toThrow(
        ValidacionError
      );
      expect(repo.crearNuevaVersion).not.toHaveBeenCalled();
    });

    it("lanza ValidacionError si 'valor' es null", async () => {
      const repo = crearRepo();
      const service = new ConfigService(repo);

      await expect(service.actualizar("clave", null, "2026-09-01", "admin-1")).rejects.toThrow(ValidacionError);
    });

    it("acepta 'valor' en 0 o cadena vacía (falsy pero válidos)", async () => {
      const repo = crearRepo();
      const service = new ConfigService(repo);

      await expect(service.actualizar("clave", 0, "2026-09-01", "admin-1")).resolves.not.toThrow();
      await expect(service.actualizar("clave", "", "2026-09-01", "admin-1")).resolves.not.toThrow();
    });

    it.each(["2026/09/01", "01-09-2026", "2026-9-1", "no es fecha", ""])(
      "lanza ValidacionError si 'vigenteDesde' tiene formato inválido: %s",
      async (vigenteDesde) => {
        const repo = crearRepo();
        const service = new ConfigService(repo);
        await expect(service.actualizar("clave", 1, vigenteDesde, "admin-1")).rejects.toThrow(ValidacionError);
      }
    );
  });
});
