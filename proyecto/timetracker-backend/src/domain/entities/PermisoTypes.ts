export type TipoPermiso = "PARCIAL" | "COMPLETO";
export type EstadoPermiso = "BORRADOR" | "ENVIADO";

export interface PermisoProps {
  id: string;
  usuarioId: string;
  fechaSolicitud: string; // YYYY-MM-DD
  horas: number;
  tipo: TipoPermiso;
  descripcion: string;
  estado: EstadoPermiso;
}

export interface NuevoPermisoDTO {
  fechaSolicitud: string;
  horas: number;
  tipo: TipoPermiso;
  descripcion: string;
}
