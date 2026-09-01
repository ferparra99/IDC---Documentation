import { FestivoRepository } from "../../infrastructure/repositories/FestivoRepository";
import { ColombianHolidaysService } from "../../domain/services/ColombianHolidaysService";

/**
 * Se asegura de que la tabla `festivos` tenga los festivos calculados para
 * un año dado. Es idempotente (ON CONFLICT ... DO UPDATE en el repositorio),
 * así que se puede llamar de forma "perezosa" cada vez que el calendario
 * pide un mes de un año aún no sincronizado, sin necesidad de un cron aparte.
 */
export class HolidaySyncService {
  constructor(
    private readonly festivos: FestivoRepository,
    private readonly calculadora: ColombianHolidaysService = new ColombianHolidaysService()
  ) {}

  async asegurarAnioSincronizado(anio: number): Promise<void> {
    const yaExiste = await this.festivos.existeAnio(anio);
    if (yaExiste) return;
    const calculados = this.calculadora.calcularParaAnio(anio);
    await this.festivos.guardarVarios(calculados);
  }
}
