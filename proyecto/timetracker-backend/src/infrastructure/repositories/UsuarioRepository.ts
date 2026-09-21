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
      "SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = $1 AND activo = true",
      [email]
    );
    return rows[0] ? aUsuario(rows[0]) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const { rows } = await this.pool.query<FilaUsuario>(
      "SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE id = $1 AND activo = true",
      [id]
    );
    return rows[0] ? aUsuario(rows[0]) : null;
  }

  async existePorEmail(email: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ existe: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM usuarios WHERE email = $1) AS existe",
      [email]
    );
    return rows[0]?.existe ?? false;
  }

  async crear(usuario: Omit<Usuario, "id"> & { id?: string }): Promise<Usuario> {
    const { rows } = await this.pool.query<FilaUsuario>(
      "INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, password_hash, rol, activo",
      [usuario.nombre, usuario.email, usuario.passwordHash, usuario.rol, usuario.activo]
    );
    return aUsuario(rows[0]);
  }

  async listarTodos(): Promise<Usuario[]> {
    const { rows } = await this.pool.query<FilaUsuario>(
      "SELECT id, nombre, email, password_hash, rol, activo FROM usuarios ORDER BY creado_en DESC"
    );
    return rows.map(aUsuario);
  }
}
