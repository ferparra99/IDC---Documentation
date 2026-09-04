import { describe, it, expect, vi, type Mock } from "vitest";
import { HolidaySyncService } from "./HolidaySyncService";
import { FestivoRepository } from "../../infrastructure/repositories/FestivoRepository";

function crearRepo() {
  return {
    existeAnio: vi.fn(),
    guardarVarios: vi.fn(),
    buscarPorRango: vi.fn(),
  } as unknown as FestivoRepository;
}

describe("HolidaySyncService", () => {
  it("no recalcula ni guarda nada si el año ya está sincronizado", async () => {
    const repo = crearRepo();
    (repo.existeAnio as Mock).mockResolvedValue(true);
    const service = new HolidaySyncService(repo);

    await service.asegurarAnioSincronizado(2026);

    expect(repo.guardarVarios).not.toHaveBeenCalled();
  });

  it("calcula y guarda los festivos si el año no está sincronizado", async () => {
    const repo = crearRepo();
    (repo.existeAnio as Mock).mockResolvedValue(false);
    const service = new HolidaySyncService(repo);

    await service.asegurarAnioSincronizado(2026);

    expect(repo.guardarVarios).toHaveBeenCalledTimes(1);
    const festivosGuardados = (repo.guardarVarios as Mock).mock.calls[0][0];
    expect(festivosGuardados).toHaveLength(18);
    expect(festivosGuardados[0]).toEqual({ fecha: "2026-01-01", nombre: "Año Nuevo" });
  });

  it("es idempotente: llamar dos veces seguidas para el mismo año solo guarda una vez (según el repo)", async () => {
    const repo = crearRepo();
    (repo.existeAnio as Mock).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const service = new HolidaySyncService(repo);

    await service.asegurarAnioSincronizado(2026);
    await service.asegurarAnioSincronizado(2026);

    expect(repo.guardarVarios).toHaveBeenCalledTimes(1);
  });
});
