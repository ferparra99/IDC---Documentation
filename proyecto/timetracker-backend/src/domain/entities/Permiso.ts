import { PermisoProps, NuevoPermisoDTO } from "./PermisoTypes";
import { TransicionInvalidaError, ValidacionError } from "../errors/DomainError";

/**
 * A diferencia de `RegistroJornada`, este ciclo de vida solo tiene UNA
 * transición real (`BORRADOR -> ENVIADO`) y ninguna variación de
 * comportamiento por estado más allá de "permitido / no permitido". Usar el
 * patrón State completo aquí sería sobre-ingeniería (una clase por estado
 * para un único `if`); en su lugar, la entidad valida sus propias
 * invariantes directamente — sigue siendo OOP y Single Responsibility
 * (la entidad es dueña de sus reglas), solo que sin la maquinaria del GoF
 * State, reservada para máquinas de estados con comportamiento realmente
 * distinto por estado (ver `RegistroJornada` y docs/STATE_MACHINE.md).
 */
export class Permiso {
  private props: PermisoProps;

  private constructor(props: PermisoProps) {
    this.props = props;
  }

  static crear(id: string, usuarioId: string, dto: NuevoPermisoDTO): Permiso {
    Permiso.validarDTO(dto);
    return new Permiso({
      id,
      usuarioId,
      fechaSolicitud: dto.fechaSolicitud,
      horas: dto.horas,
      tipo: dto.tipo,
      descripcion: dto.descripcion.trim(),
      estado: "BORRADOR",
    });
  }

  static desdeProps(props: PermisoProps): Permiso {
    return new Permiso(props);
  }

  editar(dto: NuevoPermisoDTO): void {
    if (this.props.estado !== "BORRADOR") {
      throw new TransicionInvalidaError("Solo se puede editar un permiso mientras está en estado BORRADOR.");
    }
    Permiso.validarDTO(dto);
    this.props = {
      ...this.props,
      fechaSolicitud: dto.fechaSolicitud,
      horas: dto.horas,
      tipo: dto.tipo,
      descripcion: dto.descripcion.trim(),
    };
  }

  enviar(): void {
    if (this.props.estado !== "BORRADOR") {
      throw new TransicionInvalidaError("El permiso ya fue enviado.");
    }
    this.props.estado = "ENVIADO";
  }

  toProps(): PermisoProps {
    return { ...this.props };
  }

  private static validarDTO(dto: NuevoPermisoDTO): void {
    if (!dto.fechaSolicitud || !/^\d{4}-\d{2}-\d{2}$/.test(dto.fechaSolicitud)) {
      throw new ValidacionError("El campo 'fechaSolicitud' debe tener formato YYYY-MM-DD.");
    }
    if (!dto.horas || dto.horas <= 0) {
      throw new ValidacionError("El campo 'horas' debe ser mayor a 0.");
    }
    if (dto.tipo !== "PARCIAL" && dto.tipo !== "COMPLETO") {
      throw new ValidacionError("El campo 'tipo' debe ser 'PARCIAL' o 'COMPLETO'.");
    }
    if (!dto.descripcion || dto.descripcion.trim().length === 0) {
      throw new ValidacionError("El campo 'descripcion' es obligatorio.");
    }
    if (dto.tipo === "COMPLETO" && dto.horas > 24) {
      throw new ValidacionError("Un permiso 'COMPLETO' no puede superar 24 horas.");
    }
  }
}
