import { ViajeRepository } from "../../infrastructure/repositories/ViajeRepository";
import { ConfiguracionRepository } from "../../infrastructure/repositories/ConfiguracionRepository";
import { Viaje } from "../../domain/entities/Viaje";
import { NuevoViajeDTO, ViajeProps } from "../../domain/entities/ViajeTypes";
import { NoAutorizadoError, NoEncontradoError } from "../../domain/errors/DomainError";
import { logger } from "../../shared/logger/logger";

const VALOR_POR_DEFECTO_RESPALDO = 5000;

export class ViajeService {
  constructor(
    private readonly viajes: ViajeRepository,
    private readonly configuracion: ConfiguracionRepository
  ) {}

  async crear(usuarioId: string, dto: NuevoViajeDTO): Promise<ViajeProps> {
    const valorPorDefecto = await this.obtenerValorPorDefecto();
    const entidad = Viaje.crear("", usuarioId, dto, valorPorDefecto);
    const guardado = await this.viajes.crear(entidad.toProps());
    logger.info({ usuarioId, viajeId: guardado.id, fecha: guardado.fecha, valor: guardado.valor }, "Viaje registrado");
    return guardado;
  }

  async editar(id: string, usuarioId: string, esAdmin: boolean, dto: NuevoViajeDTO): Promise<ViajeProps> {
    const existente = await this.obtenerPropio(id, usuarioId, esAdmin);
    const valorPorDefecto = await this.obtenerValorPorDefecto();
    const entidad = Viaje.desdeProps(existente);
    entidad.editar(dto, valorPorDefecto);
    return this.viajes.guardar(entidad.toProps());
  }

  async eliminar(id: string, usuarioId: string, esAdmin: boolean): Promise<void> {
    await this.obtenerPropio(id, usuarioId, esAdmin);
    await this.viajes.eliminar(id);
    logger.info({ usuarioId, viajeId: id }, "Viaje eliminado");
  }

  async listar(usuarioId: string, desde: string, hasta: string): Promise<ViajeProps[]> {
    return this.viajes.listarPorRango(usuarioId, desde, hasta);
  }

  private async obtenerPropio(id: string, usuarioId: string, esAdmin: boolean): Promise<ViajeProps> {
    const viaje = await this.viajes.buscarPorId(id);
    if (!viaje) throw new NoEncontradoError("El viaje no existe.");
    if (viaje.usuarioId !== usuarioId && !esAdmin) {
      throw new NoAutorizadoError("No puedes modificar el viaje de otro usuario.");
    }
    return viaje;
  }

  private async obtenerValorPorDefecto(): Promise<number> {
    const valor = await this.configuracion.obtenerVigente<number>("valorViajePorDefecto");
    return valor ?? VALOR_POR_DEFECTO_RESPALDO;
  }
}
