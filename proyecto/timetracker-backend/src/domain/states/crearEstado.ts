import { EstadoJornada, JornadaTransitionTarget } from "../entities/RegistroJornadaTypes";
import { JornadaState } from "./JornadaState";
import { SinIniciarState } from "./SinIniciarState";
import { JornadaActivaState } from "./JornadaActivaState";
import { JornadaFinalizadaState } from "./JornadaFinalizadaState";

/**
 * Único punto donde se traduce el string `estado` (tal como se persiste en BD)
 * a la instancia de clase de estado correspondiente. Agregar un estado nuevo
 * (ej. `EnPermisoState` en Fase 3) implica: crear la clase y añadir un `case`
 * aquí — no tocar las clases de estado existentes (Open/Closed).
 */
export function crearEstado(estado: EstadoJornada, target: JornadaTransitionTarget): JornadaState {
  switch (estado) {
    case "SIN_INICIAR":
      return new SinIniciarState(target);
    case "JORNADA_ACTIVA":
      return new JornadaActivaState(target);
    case "JORNADA_FINALIZADA":
      return new JornadaFinalizadaState(target);
    case "EN_PERMISO":
      throw new Error("Estado EN_PERMISO aún no implementado (reservado para Fase 3).");
  }
}
