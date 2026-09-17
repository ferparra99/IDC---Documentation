import { EstadoJornada, RegistroDTO } from "../api/types";

export function formatearEstado(estado: EstadoJornada | null | undefined, registro?: RegistroDTO | null): string {
  if (!estado) return "—";
  if (estado === "SIN_INICIAR") return "Jornada sin iniciar";
  if (estado === "JORNADA_ACTIVA") return "Jornada iniciada";
  if (estado === "EN_PERMISO") return "En permiso";
  if (estado === "JORNADA_FINALIZADA") {
    if (registro?.editadoManualmente) return "Jornada modificada";
    if (registro?.origen === "manual") return "Jornada agregada";
    return "Jornada finalizada";
  }
  return estado;
}

export function colorEstado(estado: EstadoJornada | null | undefined, registro?: RegistroDTO | null): string {
  if (estado === "JORNADA_ACTIVA") return "var(--accent-primary)";
  if (estado === "JORNADA_FINALIZADA" && registro?.editadoManualmente) return "#D6B85E";
  if (estado === "JORNADA_FINALIZADA" && registro?.origen === "manual") return "#9B7FE0";
  if (estado === "JORNADA_FINALIZADA") return "#10B981";
  if (estado === "SIN_INICIAR") return "var(--text-tertiary)";
  return "var(--text-secondary)";
}
