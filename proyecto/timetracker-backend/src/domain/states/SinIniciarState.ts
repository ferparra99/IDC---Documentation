import { JornadaState } from "./JornadaState";
import { EstadoJornada } from "../entities/RegistroJornadaTypes";

export class SinIniciarState extends JornadaState {
  readonly nombre: EstadoJornada = "SIN_INICIAR";

  iniciar(): void {
    this.target.aplicarInicio(new Date());
  }
}
