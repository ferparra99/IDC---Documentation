import { PermisoRepository } from "../../infrastructure/repositories/PermisoRepository";
import { RegistroJornadaRepository } from "../../infrastructure/repositories/RegistroJornadaRepository";
import { UsuarioRepository } from "../../infrastructure/repositories/UsuarioRepository";
import { ConfiguracionRepository } from "../../infrastructure/repositories/ConfiguracionRepository";
import { Permiso } from "../../domain/entities/Permiso";
import { NuevoPermisoDTO, PermisoProps } from "../../domain/entities/PermisoTypes";
import { NoAutorizadoError, NoEncontradoError, ValidacionError } from "../../domain/errors/DomainError";
import { aUsuarioPublico, UsuarioPublico } from "../../domain/entities/Usuario";
import { obtenerConfiguracionVigente } from "./ConfiguracionVigenteFactory";

export interface PreviewPermisoDTO {
  empleado: UsuarioPublico;
  permiso: PermisoProps;
}

export class PermisoService {
  constructor(
    private readonly permisos: PermisoRepository,
    private readonly registrosJornada: RegistroJornadaRepository,
    private readonly usuarios: UsuarioRepository,
    private readonly configuracion: ConfiguracionRepository
  ) {}

  async crear(usuarioId: string, dto: NuevoPermisoDTO): Promise<PermisoProps> {
    await this.validarContraJornadaDelDia(usuarioId, dto);
    const entidad = Permiso.crear("", usuarioId, dto);
    return this.permisos.crear(entidad.toProps());
  }

  async editar(id: string, usuarioId: string, dto: NuevoPermisoDTO): Promise<PermisoProps> {
    const existente = await this.obtenerPropio(id, usuarioId, false);
    await this.validarContraJornadaDelDia(usuarioId, dto);
    const entidad = Permiso.desdeProps(existente);
    entidad.editar(dto);
    return this.permisos.guardar(entidad.toProps());
  }

  async obtenerPreview(id: string, usuarioId: string, esAdmin: boolean): Promise<PreviewPermisoDTO> {
    const permiso = await this.obtenerPropio(id, usuarioId, esAdmin);
    const empleado = await this.usuarios.buscarPorId(permiso.usuarioId);
    if (!empleado) throw new NoEncontradoError("El empleado asociado al permiso no existe.");
    return { empleado: aUsuarioPublico(empleado), permiso };
  }

  async enviar(id: string, usuarioId: string): Promise<PermisoProps> {
    const existente = await this.obtenerPropio(id, usuarioId, false);
    const entidad = Permiso.desdeProps(existente);
    entidad.enviar();
    return this.permisos.guardar(entidad.toProps());
  }

  async listar(usuarioId: string, desde?: string, hasta?: string): Promise<PermisoProps[]> {
    return this.permisos.listarPorUsuario(usuarioId, desde, hasta);
  }

  private async obtenerPropio(id: string, usuarioId: string, esAdmin: boolean): Promise<PermisoProps> {
    const permiso = await this.permisos.buscarPorId(id);
    if (!permiso) throw new NoEncontradoError("El permiso no existe.");
    if (permiso.usuarioId !== usuarioId && !esAdmin) {
      throw new NoAutorizadoError("No puedes acceder al permiso de otro usuario.");
    }
    return permiso;
  }

  /**
   * Regla de interacción permisos/jornada (docs/STATE_MACHINE.md, sección 3.5):
   * un permiso 'COMPLETO' no puede solicitarse para un día que ya tiene horas
   * registradas; un permiso 'PARCIAL' no puede exceder las horas restantes
   * del día (umbral = horasOrdinariasPorDia - horas ya trabajadas ese día).
   */
  private async validarContraJornadaDelDia(usuarioId: string, dto: NuevoPermisoDTO): Promise<void> {
    const registro = await this.registrosJornada.buscarPorUsuarioYFecha(usuarioId, dto.fechaSolicitud);
    if (!registro) return;

    const horasYaRegistradas =
      registro.horasOrdinarias +
      registro.horasExtraDiurnas +
      registro.horasExtraNocturnas +
      registro.horasRecargoNocturno +
      registro.horasDominicalFestivo;

    if (horasYaRegistradas === 0 && registro.estado !== "JORNADA_ACTIVA") return;

    if (dto.tipo === "COMPLETO") {
      throw new ValidacionError(
        "No se puede solicitar un permiso 'COMPLETO' para un día que ya tiene jornada registrada o activa."
      );
    }

    const horasOrdinariasPorDia =
      (await this.configuracion.obtenerVigente<number>("horasOrdinariasPorDia")) ?? 8;
    const horasRestantes = Math.max(0, horasOrdinariasPorDia - horasYaRegistradas);

    if (dto.horas > horasRestantes) {
      throw new ValidacionError(
        `El permiso 'PARCIAL' excede las horas restantes del día (quedan ${horasRestantes}h disponibles).`
      );
    }
  }
}
