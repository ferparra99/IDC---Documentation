import { JornadaTransitionTarget, RegistroJornadaProps } from "./RegistroJornadaTypes";
import { JornadaState } from "../states/JornadaState";
import { crearEstado } from "../states/crearEstado";
import { CalculadoraHorasService } from "../services/CalculadoraHorasService";
import { ConfiguracionVigente } from "../services/ConfiguracionVigente";
import { TransicionInvalidaError } from "../errors/DomainError";

/**
 * Entidad de dominio. No sabe nada de HTTP ni de SQL (Dependency Inversion):
 * expone comportamiento de negocio (`iniciar`, `finalizar`) y delega la
 * validez de la transición en el objeto de estado actual (patrón State).
 */
export class RegistroJornada implements JornadaTransitionTarget {
  private props: RegistroJornadaProps;
  private estadoActual: JornadaState;

  constructor(
    props: RegistroJornadaProps,
    private readonly calculadoraHoras: CalculadoraHorasService,
    private readonly esDominicalOFestivo: boolean
  ) {
    this.props = props;
    this.estadoActual = crearEstado(props.estado, this);
  }

  iniciar(): void {
    this.estadoActual.iniciar();
  }

  finalizar(descripcionProyectos: string): void {
    this.estadoActual.finalizar(descripcionProyectos);
  }

  /** Invocado únicamente por SinIniciarState — no debe llamarse directamente desde fuera. */
  aplicarInicio(horaInicio: Date): void {
    this.props.horaInicio = horaInicio;
    this.props.estado = "JORNADA_ACTIVA";
    this.estadoActual = crearEstado("JORNADA_ACTIVA", this);
  }

  /** Invocado únicamente por JornadaActivaState — no debe llamarse directamente desde fuera. */
  aplicarFin(horaFin: Date, descripcionProyectos: string): void {
    if (!this.props.horaInicio) {
      throw new Error("Invariante violado: no se puede finalizar sin horaInicio.");
    }
    const desglose = this.calculadoraHoras.calcular(
      this.props.horaInicio,
      horaFin,
      this.esDominicalOFestivo
    );

    this.props.horaFin = horaFin;
    this.props.descripcionProyectos = descripcionProyectos;
    this.props.estado = "JORNADA_FINALIZADA";
    this.props.horasOrdinarias = desglose.horasOrdinarias;
    this.props.horasExtraDiurnas = desglose.horasExtraDiurnas;
    this.props.horasExtraNocturnas = desglose.horasExtraNocturnas;
    this.props.horasRecargoNocturno = desglose.horasRecargoNocturno;
    this.props.horasDominicalFestivo = desglose.horasDominicalFestivo;
    this.estadoActual = crearEstado("JORNADA_FINALIZADA", this);
  }

  /**
   * Edición manual de horas ya finalizadas (módulo de calendario, Fase 2).
   * NO es una transición de estado del patrón State — el registro permanece
   * en `JORNADA_FINALIZADA` — por eso vive aquí y no en una clase de estado.
   * Solo se permite sobre jornadas ya finalizadas; de lo contrario se debe
   * usar `finalizar()` (o `iniciar()`) para llegar a ese estado primero.
   */
  editarManualmente(horaInicio: Date, horaFin: Date): void {
    if (this.props.estado !== "JORNADA_FINALIZADA") {
      throw new TransicionInvalidaError(
        `Solo se pueden editar manualmente jornadas ya finalizadas (estado actual: ${this.props.estado}).`
      );
    }
    const desglose = this.calculadoraHoras.calcular(horaInicio, horaFin, this.esDominicalOFestivo);

    this.props.horaInicio = horaInicio;
    this.props.horaFin = horaFin;
    this.props.horasOrdinarias = desglose.horasOrdinarias;
    this.props.horasExtraDiurnas = desglose.horasExtraDiurnas;
    this.props.horasExtraNocturnas = desglose.horasExtraNocturnas;
    this.props.horasRecargoNocturno = desglose.horasRecargoNocturno;
    this.props.horasDominicalFestivo = desglose.horasDominicalFestivo;
    this.props.editadoManualmente = true;
  }

  toProps(): RegistroJornadaProps {
    return { ...this.props };
  }

  static crear(
    props: RegistroJornadaProps,
    config: ConfiguracionVigente,
    esDominicalOFestivo: boolean
  ): RegistroJornada {
    return new RegistroJornada(props, new CalculadoraHorasService(config), esDominicalOFestivo);
  }
}
