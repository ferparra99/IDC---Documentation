import { JornadaState } from "./JornadaState";
import { EstadoJornada } from "../entities/RegistroJornadaTypes";
import { ValidacionError } from "../errors/DomainError";

export class JornadaActivaState extends JornadaState {
  readonly nombre: EstadoJornada = "JORNADA_ACTIVA";

  finalizar(descripcionProyectos: string): void {
    if (!descripcionProyectos || descripcionProyectos.trim().length === 0) {
      throw new ValidacionError(
        "La descripción del/los proyecto(s) trabajados es obligatoria para finalizar la jornada."
      );
    }
    this.target.aplicarFin(new Date(), descripcionProyectos.trim());
  }
}
