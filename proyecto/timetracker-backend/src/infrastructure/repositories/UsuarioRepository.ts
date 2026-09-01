import { Pool } from "pg";
import { Usuario } from "../../domain/entities/Usuario";

interface FilaUsuario {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
  rol: "empleado" | "administrador";
  activo: boolean;
}

function aUsuario(fila: FilaUsuario): Usuario {
  return {
    id: fila.id,
    nombre: fila.nombre,
    email: fila.email,
    passwordHash: fila.password_hash,
    rol: fila.rol,
    activo: fila.activo,
  };
}

export class UsuarioRepository {
  constructor(private readonly pool: Pool) {}

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const { rows } = await this.pool.query<FilaUsuario>(
      "SELECT * FROM usuarios WHERE email = $1 AND activo = true",
      [email]
    );
    return rows[0] ? aUsuario(rows[0]) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const { rows } = await this.pool.query<FilaUsuario>(
      "SELECT * FROM usuarios WHERE id = $1 AND activo = true",
      [id]
    );
    return rows[0] ? aUsuario(rows[0]) : null;
  }
}
