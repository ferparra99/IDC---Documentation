export interface ViajeProps {
  id: string;
  usuarioId: string;
  fecha: string; // YYYY-MM-DD
  puntoPartida: string;
  puntoFinal: string;
  descripcion: string;
  valor: number;
}

export interface NuevoViajeDTO {
  fecha: string;
  puntoPartida: string;
  puntoFinal: string;
  descripcion: string;
  valor?: number; // si se omite, se completa con la variable de sistema
}
