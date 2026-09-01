export type EstadoJornada = "SIN_INICIAR" | "JORNADA_ACTIVA" | "JORNADA_FINALIZADA" | "EN_PERMISO";

export interface UsuarioPublico {
  id: string;
  nombre: string;
  email: string;
  rol: "empleado" | "administrador";
}

export interface RegistroDTO {
  id: string;
  fecha: string;
  esFinDeSemana: boolean;
  estado: EstadoJornada;
  horaInicio: string | null;
  horaInicio24: string | null;
  horaFin: string | null;
  horaFin24: string | null;
  descripcionProyectos: string | null;
  horasOrdinarias: number;
  horasExtraDiurnas: number;
  horasExtraNocturnas: number;
  horasRecargoNocturno: number;
  horasDominicalFestivo: number;
  editadoManualmente: boolean;
}

export interface DiaCalendarioDTO {
  fecha: string;
  esFinDeSemana: boolean;
  esFestivo: boolean;
  nombreFestivo: string | null;
  horasTrabajadas: number;
  registroId: string | null;
  estado: EstadoJornada | null;
}

export interface ResumenSemanalDTO {
  horasTrabajadas: number;
  horasMinimasSemanales: number;
  horasExtra: number;
  horasFaltantes: number;
}

export type TipoPermiso = "PARCIAL" | "COMPLETO";
export type EstadoPermiso = "BORRADOR" | "ENVIADO";

export interface PermisoDTO {
  id: string;
  usuarioId: string;
  fechaSolicitud: string;
  horas: number;
  tipo: TipoPermiso;
  descripcion: string;
  estado: EstadoPermiso;
}

export interface PreviewPermisoDTO {
  empleado: UsuarioPublico;
  permiso: PermisoDTO;
}

export interface ViajeDTO {
  id: string;
  usuarioId: string;
  fecha: string;
  puntoPartida: string;
  puntoFinal: string;
  descripcion: string;
  valor: number;
}
