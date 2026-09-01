export type EstadoJornada =
  | "SIN_INICIAR"
  | "JORNADA_ACTIVA"
  | "JORNADA_FINALIZADA"
  | "EN_PERMISO"; // reservado para Fase 3, no se usa aún

export interface RegistroJornadaProps {
  id: string;
  usuarioId: string;
  fecha: string; // YYYY-MM-DD en Bogotá, fecha de INICIO (docs/STATE_MACHINE.md 3.1)
  horaInicio: Date | null; // UTC
  horaFin: Date | null; // UTC
  estado: EstadoJornada;
  descripcionProyectos: string | null;
  horasOrdinarias: number;
  horasExtraDiurnas: number;
  horasExtraNocturnas: number;
  horasRecargoNocturno: number;
  horasDominicalFestivo: number;
  editadoManualmente: boolean;
}

/**
 * Contrato mínimo que los estados concretos (patrón State) necesitan para
 * aplicar una transición sobre la entidad, sin depender de la clase completa
 * `RegistroJornada` — evita import circular entre entidad y estados.
 */
export interface JornadaTransitionTarget {
  aplicarInicio(horaInicio: Date): void;
  aplicarFin(horaFin: Date, descripcionProyectos: string): void;
}

/** Props para crear un registro nuevo (aún sin persistir), estado inicial SIN_INICIAR. */
export function nuevoRegistroJornada(usuarioId: string, fecha: string): RegistroJornadaProps {
  return {
    id: "", // lo asigna la base de datos al insertar
    usuarioId,
    fecha,
    horaInicio: null,
    horaFin: null,
    estado: "SIN_INICIAR",
    descripcionProyectos: null,
    horasOrdinarias: 0,
    horasExtraDiurnas: 0,
    horasExtraNocturnas: 0,
    horasRecargoNocturno: 0,
    horasDominicalFestivo: 0,
    editadoManualmente: false,
  };
}
