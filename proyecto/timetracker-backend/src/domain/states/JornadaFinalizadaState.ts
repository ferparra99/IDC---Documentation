import { JornadaState } from "./JornadaState";
import { EstadoJornada } from "../entities/RegistroJornadaTypes";

/**
 * Estado terminal: no sobrescribe iniciar()/finalizar(), por lo que ambos
 * caen en el comportamiento por defecto de JornadaState (rechazar con
 * TransicionInvalidaError). Una corrección posterior no es una transición de
 * estado: es una edición manual auditada (docs/STATE_MACHINE.md, sección 3.1
 * y módulo de calendario, Fase 2), fuera del alcance de esta máquina.
 */
export class JornadaFinalizadaState extends JornadaState {
  readonly nombre: EstadoJornada = "JORNADA_FINALIZADA";
}
