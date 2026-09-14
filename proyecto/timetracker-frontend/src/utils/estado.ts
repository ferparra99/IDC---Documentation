import { EstadoJornada } from "../api/types";

export function formatearEstado(estado: EstadoJornada | string | null | undefined): string {
  switch (estado) {
    case "SIN_INICIAR": return "Sin iniciar";
    case "JORNADA_ACTIVA": return "Jornada activa";
    case "JORNADA_FINALIZADA": return "Jornada Finalizada";
    case "EN_PERMISO": return "En permiso";
    default: return estado ?? "-";
  }
}
