import { NuevoViajeDTO, ViajeProps } from "./ViajeTypes";
import { ValidacionError } from "../errors/DomainError";

/**
 * Entidad más simple del sistema: no tiene estados ni transiciones, solo
 * invariantes de datos. Se modela como clase (no como función suelta) para
 * mantener consistencia con el resto del dominio y porque encapsula su
 * propia validación (Single Responsibility) — pero deliberadamente no hay
 * patrón State ni entidad rica con comportamiento adicional, porque no hay
 * comportamiento que modelar más allá de "crear con datos válidos" y
 * "reemplazar datos con datos válidos".
 */
export class Viaje {
  private constructor(private props: ViajeProps) {}

  static crear(id: string, usuarioId: string, dto: NuevoViajeDTO, valorPorDefecto: number): Viaje {
    Viaje.validarDTO(dto);
    return new Viaje({
      id,
      usuarioId,
      fecha: dto.fecha,
      puntoPartida: dto.puntoPartida.trim(),
      puntoFinal: dto.puntoFinal.trim(),
      descripcion: dto.descripcion.trim(),
      valor: dto.valor ?? valorPorDefecto,
    });
  }

  static desdeProps(props: ViajeProps): Viaje {
    return new Viaje(props);
  }

  editar(dto: NuevoViajeDTO, valorPorDefecto: number): void {
    Viaje.validarDTO(dto);
    this.props = {
      ...this.props,
      fecha: dto.fecha,
      puntoPartida: dto.puntoPartida.trim(),
      puntoFinal: dto.puntoFinal.trim(),
      descripcion: dto.descripcion.trim(),
      valor: dto.valor ?? valorPorDefecto,
    };
  }

  toProps(): ViajeProps {
    return { ...this.props };
  }

  private static validarDTO(dto: NuevoViajeDTO): void {
    if (!dto.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(dto.fecha)) {
      throw new ValidacionError("El campo 'fecha' debe tener formato YYYY-MM-DD.");
    }
    if (!dto.puntoPartida || dto.puntoPartida.trim().length === 0) {
      throw new ValidacionError("El campo 'puntoPartida' es obligatorio.");
    }
    if (!dto.puntoFinal || dto.puntoFinal.trim().length === 0) {
      throw new ValidacionError("El campo 'puntoFinal' es obligatorio.");
    }
    if (!dto.descripcion || dto.descripcion.trim().length === 0) {
      throw new ValidacionError("El campo 'descripcion' (motivo del viaje) es obligatorio.");
    }
    if (dto.valor !== undefined && dto.valor < 0) {
      throw new ValidacionError("El campo 'valor' no puede ser negativo.");
    }
  }
}
