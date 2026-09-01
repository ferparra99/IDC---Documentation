import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UsuarioRepository } from "../../infrastructure/repositories/UsuarioRepository";
import { aUsuarioPublico, UsuarioPublico } from "../../domain/entities/Usuario";
import { CredencialesInvalidasError } from "../../domain/errors/DomainError";
import { env } from "../../shared/config/env";

export interface LoginResultado {
  token: string;
  usuario: UsuarioPublico;
}

export interface TokenPayload {
  sub: string; // usuarioId
  rol: "empleado" | "administrador";
}

export class AuthService {
  constructor(private readonly usuarios: UsuarioRepository) {}

  async login(email: string, password: string): Promise<LoginResultado> {
    const usuario = await this.usuarios.buscarPorEmail(email);
    if (!usuario) {
      throw new CredencialesInvalidasError("Email o contraseña incorrectos.");
    }

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValido) {
      throw new CredencialesInvalidasError("Email o contraseña incorrectos.");
    }

    const payload: TokenPayload = { sub: usuario.id, rol: usuario.rol };
    const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);

    return { token, usuario: aUsuarioPublico(usuario) };
  }
}
