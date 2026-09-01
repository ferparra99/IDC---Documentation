import { DateTime } from "luxon";
import { RegistroJornadaRepository } from "../../infrastructure/repositories/RegistroJornadaRepository";
import { FestivoRepository } from "../../infrastructure/repositories/FestivoRepository";
import { HolidaySyncService } from "./HolidaySyncService";
import { ZONA_HORARIA } from "../../shared/config/env";
import { esFinDeSemanaBogotaFecha } from "../../shared/utils/tiempo";
import { ValidacionError } from "../../domain/errors/DomainError";

export interface DiaCalendarioDTO {
  fecha: string;
  esFinDeSemana: boolean;
  esFestivo: boolean;
  nombreFestivo: string | null;
  horasTrabajadas: number;
  registroId: string | null;
  estado: string | null;
}

export class CalendarService {
  constructor(
    private readonly registros: RegistroJornadaRepository,
    private readonly festivos: FestivoRepository,
    private readonly holidaySync: HolidaySyncService
  ) {}

  async obtenerMes(usuarioId: string, anio: number, mes: number): Promise<DiaCalendarioDTO[]> {
    if (mes < 1 || mes > 12) {
      throw new ValidacionError("El parámetro 'mes' debe estar entre 1 y 12.");
    }

    await this.holidaySync.asegurarAnioSincronizado(anio);

    const inicioMes = DateTime.fromObject({ year: anio, month: mes, day: 1 }, { zone: ZONA_HORARIA });
    const finMes = inicioMes.endOf("month");
    const desde = inicioMes.toFormat("yyyy-MM-dd");
    const hasta = finMes.toFormat("yyyy-MM-dd");

    const [registros, mapaFestivos] = await Promise.all([
      this.registros.listarPorRango(usuarioId, desde, hasta),
      this.festivos.buscarPorRango(desde, hasta),
    ]);

    const registrosPorFecha = new Map(registros.map((r) => [r.fecha, r]));

    const dias: DiaCalendarioDTO[] = [];
    let cursor = inicioMes;
    while (cursor <= finMes) {
      const fecha = cursor.toFormat("yyyy-MM-dd");
      const registro = registrosPorFecha.get(fecha) ?? null;
      const horasTrabajadas = registro
        ? registro.horasOrdinarias +
          registro.horasExtraDiurnas +
          registro.horasExtraNocturnas +
          registro.horasRecargoNocturno +
          registro.horasDominicalFestivo
        : 0;

      dias.push({
        fecha,
        esFinDeSemana: esFinDeSemanaBogotaFecha(fecha),
        esFestivo: mapaFestivos.has(fecha),
        nombreFestivo: mapaFestivos.get(fecha) ?? null,
        horasTrabajadas: Math.round(horasTrabajadas * 100) / 100,
        registroId: registro?.id ?? null,
        estado: registro?.estado ?? null,
      });

      cursor = cursor.plus({ days: 1 });
    }

    return dias;
  }
}
