import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { UsuarioRepository } from "../../infrastructure/repositories/UsuarioRepository";
import { RefreshTokenRepository } from "../../infrastructure/repositories/RefreshTokenRepository";
import { aUsuarioPublico, Usuario, UsuarioPublico } from "../../domain/entities/Usuario";
import { CredencialesInvalidasError } from "../../domain/errors/DomainError";
import { env } from "../../shared/config/env";
import { logger } from "../../shared/logger/logger";

const REFRESH_TOKEN_TTL_DIAS = 30;

export interface LoginResultado {
  token: string;
  refreshToken: string;
  usuario: UsuarioPublico;
}

export interface RefreshResultado {
  token: string;
  refreshToken: string;
}

export interface TokenPayload {
  sub: string; // usuarioId
  rol: "empleado" | "administrador";
}

/**
 * Autenticación de dos capas, pensada para que la app móvil (Fase 6) pueda
 * mantener sesiones largas sin pedir contraseña cada pocas horas:
 *  - `token` (JWT de acceso): vida corta (`JWT_EXPIRES_IN`, por defecto 1h),
 *    es lo que viaja en cada request como `Authorization: Bearer`.
 *  - `refreshToken` (opaco, NO es JWT): vida larga (30 días), se guarda
 *    hasheado (SHA-256) en `refresh_tokens` para poder revocarlo — un JWT no
 *    se puede invalidar antes de su expiración sin una lista de revocación,
 *    y tanto la web como el móvil necesitan poder "cerrar sesión" de verdad.
 *  - Cada `refrescar()` rota el refresh token (revoca el usado, emite uno
 *    nuevo), lo que limita el daño si un refresh token llega a filtrarse.
 */
export class AuthService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly refreshTokens: RefreshTokenRepository
  ) {}

  async login(email: string, password: string): Promise<LoginResultado> {
    const usuario = await this.usuarios.buscarPorEmail(email);
    if (!usuario) {
      logger.warn({ email }, "Intento de login con email no existente");
      throw new CredencialesInvalidasError("Email o contraseña incorrectos.");
    }

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValido) {
      logger.warn({ email, usuarioId: usuario.id }, "Intento de login con contraseña incorrecta");
      throw new CredencialesInvalidasError("Email o contraseña incorrectos.");
    }

    const token = this.generarAccessToken(usuario);
    const refreshToken = await this.generarYGuardarRefreshToken(usuario.id);

    logger.info({ usuarioId: usuario.id, rol: usuario.rol }, "Login exitoso");
    return { token, refreshToken, usuario: aUsuarioPublico(usuario) };
  }

  async refrescar(refreshTokenPlano: string): Promise<RefreshResultado> {
    const registro = await this.refreshTokens.buscarValido(refreshTokenPlano);
    if (!registro) {
      throw new CredencialesInvalidasError("El refresh token es inválido o expiró. Inicia sesión nuevamente.");
    }

    const usuario = await this.usuarios.buscarPorId(registro.usuarioId);
    if (!usuario) {
      throw new CredencialesInvalidasError("El usuario asociado al token ya no existe.");
    }

    // Rotación: se revoca el token usado y se emite uno nuevo.
    await this.refreshTokens.revocarPorId(registro.id);
    const nuevoRefreshToken = await this.generarYGuardarRefreshToken(usuario.id);
    const nuevoAccessToken = this.generarAccessToken(usuario);

    logger.info({ usuarioId: usuario.id }, "Token de acceso renovado");
    return { token: nuevoAccessToken, refreshToken: nuevoRefreshToken };
  }

  async logout(refreshTokenPlano: string): Promise<void> {
    await this.refreshTokens.revocarPorToken(refreshTokenPlano);
    logger.info("Sesión cerrada (refresh token revocado)");
  }

  private generarAccessToken(usuario: Usuario): string {
    const payload: TokenPayload = { sub: usuario.id, rol: usuario.rol };
    return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
  }

  private async generarYGuardarRefreshToken(usuarioId: string): Promise<string> {
    const tokenPlano = crypto.randomBytes(40).toString("hex");
    const expiraEn = new Date(Date.now() + REFRESH_TOKEN_TTL_DIAS * 24 * 60 * 60 * 1000);
    await this.refreshTokens.crear(usuarioId, tokenPlano, expiraEn);
    return tokenPlano;
  }
}
