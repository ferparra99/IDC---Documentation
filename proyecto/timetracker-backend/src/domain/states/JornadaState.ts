import { TransicionInvalidaError } from "../errors/DomainError";
import { EstadoJornada, JornadaTransitionTarget } from "../entities/RegistroJornadaTypes";

/**
 * Patrón de diseño State (GoF) — ver docs/STATE_MACHINE.md.
 *
 * Cada estado concreto de la jornada implementa esta interfaz y decide qué
 * transiciones acepta. `RegistroJornada` (la entidad) delega en la instancia
 * de estado actual en vez de tener `switch/if` dispersos — esto cumple
 * Open/Closed: agregar un estado nuevo (ej. EN_PERMISO en Fase 3) no obliga
 * a modificar los estados existentes, solo a agregar una clase nueva.
 *
 * Los métodos por defecto rechazan la transición; cada estado concreto
 * sobrescribe únicamente las transiciones que sí permite.
 */
export abstract class JornadaState {
  abstract readonly nombre: EstadoJornada;

  constructor(protected readonly target: JornadaTransitionTarget) {}

  iniciar(): void {
    throw new TransicionInvalidaError(
      `No se puede iniciar una jornada que está en estado ${this.nombre}.`
    );
  }

  finalizar(_descripcionProyectos: string): void {
    throw new TransicionInvalidaError(
      `No se puede finalizar una jornada que está en estado ${this.nombre}.`
    );
  }
}
