import { ConfiguracionRepository, ConfiguracionItem } from "../../infrastructure/repositories/ConfiguracionRepository";
import { ValidacionError } from "../../domain/errors/DomainError";

export class ConfigService {
  constructor(private readonly repo: ConfiguracionRepository) {}

  async obtenerVigentes(): Promise<ConfiguracionItem[]> {
    return this.repo.obtenerTodasVigentes();
  }

  async actualizar(
    clave: string,
    valor: unknown,
    vigenteDesde: string,
    actualizadoPorUsuarioId: string
  ): Promise<void> {
    if (valor === undefined || valor === null) {
      throw new ValidacionError("El campo 'valor' es obligatorio.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vigenteDesde)) {
      throw new ValidacionError("El campo 'vigenteDesde' debe tener formato YYYY-MM-DD.");
    }
    await this.repo.crearNuevaVersion(clave, valor, vigenteDesde, actualizadoPorUsuarioId);
  }
}
