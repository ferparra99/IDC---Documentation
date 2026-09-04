import { describe, it, expect, vi, type Mock } from "vitest";
import { CalendarService } from "./CalendarService";
import { RegistroJornadaRepository } from "../../infrastructure/repositories/RegistroJornadaRepository";
import { FestivoRepository } from "../../infrastructure/repositories/FestivoRepository";
import { HolidaySyncService } from "./HolidaySyncService";
import { ValidacionError } from "../../domain/errors/DomainError";
import { RegistroJornadaProps } from "../../domain/entities/RegistroJornadaTypes";

function crearDependencias() {
  const registros = { listarPorRango: vi.fn() } as unknown as RegistroJornadaRepository;
  const festivos = { buscarPorRango: vi.fn() } as unknown as FestivoRepository;
  const holidaySync = { asegurarAnioSincronizado: vi.fn() } as unknown as HolidaySyncService;
  return { registros, festivos, holidaySync };
}

function registroDeEjemplo(overrides: Partial<RegistroJornadaProps> = {}): RegistroJornadaProps {
  return {
    id: "registro-1",
    usuarioId: "usuario-1",
    fecha: "2026-08-10",
    horaInicio: new Date("2026-08-10T13:00:00Z"),
    horaFin: new Date("2026-08-10T22:00:00Z"),
    estado: "JORNADA_FINALIZADA",
    descripcionProyectos: "algo",
    horasOrdinarias: 8,
    horasExtraDiurnas: 1,
    horasExtraNocturnas: 0,
    horasRecargoNocturno: 0,
    horasDominicalFestivo: 0,
    editadoManualmente: false,
    ...overrides,
  };
}

describe("CalendarService", () => {
  it("rechaza meses fuera de 1-12", async () => {
    const { registros, festivos, holidaySync } = crearDependencias();
    const service = new CalendarService(registros, festivos, holidaySync);

    await expect(service.obtenerMes("usuario-1", 2026, 0)).rejects.toThrow(ValidacionError);
    await expect(service.obtenerMes("usuario-1", 2026, 13)).rejects.toThrow(ValidacionError);
  });

  it("se asegura de sincronizar los festivos del año antes de consultar", async () => {
    const { registros, festivos, holidaySync } = crearDependencias();
    (registros.listarPorRango as Mock).mockResolvedValue([]);
    (festivos.buscarPorRango as Mock).mockResolvedValue(new Map());
    const service = new CalendarService(registros, festivos, holidaySync);

    await service.obtenerMes("usuario-1", 2026, 8);

    expect(holidaySync.asegurarAnioSincronizado).toHaveBeenCalledWith(2026);
  });

  it("devuelve un día por cada día del mes (agosto 2026 tiene 31 días)", async () => {
    const { registros, festivos, holidaySync } = crearDependencias();
    (registros.listarPorRango as Mock).mockResolvedValue([]);
    (festivos.buscarPorRango as Mock).mockResolvedValue(new Map());
    const service = new CalendarService(registros, festivos, holidaySync);

    const dias = await service.obtenerMes("usuario-1", 2026, 8);

    expect(dias).toHaveLength(31);
    expect(dias[0].fecha).toBe("2026-08-01");
    expect(dias[30].fecha).toBe("2026-08-31");
  });

  it("marca correctamente fines de semana y festivos, con horasTrabajadas sumadas del registro", async () => {
    const { registros, festivos, holidaySync } = crearDependencias();
    (registros.listarPorRango as Mock).mockResolvedValue([registroDeEjemplo()]); // 2026-08-10
    (festivos.buscarPorRango as Mock).mockResolvedValue(new Map([["2026-08-07", "Batalla de Boyacá"]]));
    const service = new CalendarService(registros, festivos, holidaySync);

    const dias = await service.obtenerMes("usuario-1", 2026, 8);

    const diaConRegistro = dias.find((d) => d.fecha === "2026-08-10")!;
    expect(diaConRegistro.horasTrabajadas).toBe(9); // 8 + 1
    expect(diaConRegistro.registroId).toBe("registro-1");
    expect(diaConRegistro.estado).toBe("JORNADA_FINALIZADA");

    const diaFestivo = dias.find((d) => d.fecha === "2026-08-07")!;
    expect(diaFestivo.esFestivo).toBe(true);
    expect(diaFestivo.nombreFestivo).toBe("Batalla de Boyacá");

    // 2026-08-01 es sábado.
    const diaFinDeSemana = dias.find((d) => d.fecha === "2026-08-01")!;
    expect(diaFinDeSemana.esFinDeSemana).toBe(true);

    // Un día laboral cualquiera sin registro: en cero, sin festivo.
    const diaVacio = dias.find((d) => d.fecha === "2026-08-11")!;
    expect(diaVacio.horasTrabajadas).toBe(0);
    expect(diaVacio.registroId).toBeNull();
    expect(diaVacio.esFestivo).toBe(false);
  });
});
