import { ConfiguracionRepository } from "../../infrastructure/repositories/ConfiguracionRepository";
import { ConfiguracionVigente, CONFIGURACION_POR_DEFECTO } from "../../domain/services/ConfiguracionVigente";

/**
 * Arma el objeto `ConfiguracionVigente` que necesita el motor de cálculo de
 * horas, leyendo las claves relevantes desde `configuracion_sistema`.
 *
 * Limitación conocida de Fase 1: siempre lee la configuración vigente "hoy",
 * no la vigente en la fecha histórica del registro que se está calculando.
 * En la práctica esto es correcto para el flujo normal (fichar y cerrar el
 * mismo día o el siguiente), pero si se requiere recalcular jornadas muy
 * antiguas después de un cambio de configuración, esto debe evolucionar a
 * una consulta "vigente en fecha X" (la tabla ya lo soporta, falta el query).
 */
export async function obtenerConfiguracionVigente(
  repo: ConfiguracionRepository
): Promise<ConfiguracionVigente> {
  const [inicioHorarioNocturno, finHorarioNocturno, horasOrdinariasPorDia] = await Promise.all([
    repo.obtenerVigente<string>("inicioHorarioNocturno"),
    repo.obtenerVigente<string>("finHorarioNocturno"),
    repo.obtenerVigente<number>("horasOrdinariasPorDia"),
  ]);

  return {
    inicioHorarioNocturno: inicioHorarioNocturno ?? CONFIGURACION_POR_DEFECTO.inicioHorarioNocturno,
    finHorarioNocturno: finHorarioNocturno ?? CONFIGURACION_POR_DEFECTO.finHorarioNocturno,
    horasOrdinariasPorDia: horasOrdinariasPorDia ?? CONFIGURACION_POR_DEFECTO.horasOrdinariasPorDia,
  };
}
