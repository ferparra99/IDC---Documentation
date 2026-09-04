import { describe, it, expect, vi, type Mock } from "vitest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthService } from "./AuthService";
import { UsuarioRepository } from "../../infrastructure/repositories/UsuarioRepository";
import { RefreshTokenRepository } from "../../infrastructure/repositories/RefreshTokenRepository";
import { Usuario } from "../../domain/entities/Usuario";
import { CredencialesInvalidasError } from "../../domain/errors/DomainError";
import { env } from "../../shared/config/env";

function crearRepos() {
  const usuarios = {
    buscarPorEmail: vi.fn(),
    buscarPorId: vi.fn(),
  } as unknown as UsuarioRepository;

  const refreshTokens = {
    crear: vi.fn(),
    buscarValido: vi.fn(),
    revocarPorId: vi.fn(),
    revocarPorToken: vi.fn(),
  } as unknown as RefreshTokenRepository;

  return { usuarios, refreshTokens };
}

async function usuarioDeEjemplo(password = "clave-correcta"): Promise<Usuario> {
  return {
    id: "usuario-1",
    nombre: "Ana Pérez",
    email: "ana@empresa.com",
    passwordHash: await bcrypt.hash(password, 4), // costo bajo para que los tests corran rápido
    rol: "empleado",
    activo: true,
  };
}

describe("AuthService", () => {
  describe("login()", () => {
    it("devuelve token, refreshToken y datos públicos del usuario con credenciales correctas", async () => {
      const { usuarios, refreshTokens } = crearRepos();
      const usuario = await usuarioDeEjemplo();
      (usuarios.buscarPorEmail as Mock).mockResolvedValue(usuario);
      const service = new AuthService(usuarios, refreshTokens);

      const resultado = await service.login("ana@empresa.com", "clave-correcta");

      expect(resultado.usuario).toEqual({ id: "usuario-1", nombre: "Ana Pérez", email: "ana@empresa.com", rol: "empleado" });
      expect(typeof resultado.token).toBe("string");
      expect(typeof resultado.refreshToken).toBe("string");
      // El access token debe ser un JWT válido, firmado con el secreto configurado.
      const payload = jwt.verify(resultado.token, env.jwtSecret) as { sub: string; rol: string };
      expect(payload.sub).toBe("usuario-1");
      expect(payload.rol).toBe("empleado");
    });

    it("persiste el refresh token en el repositorio", async () => {
      const { usuarios, refreshTokens } = crearRepos();
      (usuarios.buscarPorEmail as Mock).mockResolvedValue(await usuarioDeEjemplo());
      const service = new AuthService(usuarios, refreshTokens);

      await service.login("ana@empresa.com", "clave-correcta");

      expect(refreshTokens.crear).toHaveBeenCalledTimes(1);
      const [usuarioId, , expiraEn] = (refreshTokens.crear as Mock).mock.calls[0];
      expect(usuarioId).toBe("usuario-1");
      expect(expiraEn.getTime()).toBeGreaterThan(Date.now());
    });

    it("lanza CredencialesInvalidasError si el email no existe", async () => {
      const { usuarios, refreshTokens } = crearRepos();
      (usuarios.buscarPorEmail as Mock).mockResolvedValue(null);
      const service = new AuthService(usuarios, refreshTokens);

      await expect(service.login("no-existe@empresa.com", "cualquiera")).rejects.toThrow(
        CredencialesInvalidasError
      );
    });

    it("lanza CredencialesInvalidasError si la contraseña es incorrecta", async () => {
      const { usuarios, refreshTokens } = crearRepos();
      (usuarios.buscarPorEmail as Mock).mockResolvedValue(await usuarioDeEjemplo("clave-correcta"));
      const service = new AuthService(usuarios, refreshTokens);

      await expect(service.login("ana@empresa.com", "clave-incorrecta")).rejects.toThrow(
        CredencialesInvalidasError
      );
    });

    it("el mensaje de error es igual para email inexistente y contraseña incorrecta (no filtra cuál falló)", async () => {
      const { usuarios, refreshTokens } = crearRepos();
      (usuarios.buscarPorEmail as Mock).mockResolvedValueOnce(null);
      const service = new AuthService(usuarios, refreshTokens);
      let mensajeEmailInexistente = "";
      try {
        await service.login("x@x.com", "y");
      } catch (e) {
        mensajeEmailInexistente = (e as Error).message;
      }

      (usuarios.buscarPorEmail as Mock).mockResolvedValueOnce(await usuarioDeEjemplo());
      let mensajePasswordIncorrecta = "";
      try {
        await service.login("ana@empresa.com", "incorrecta");
      } catch (e) {
        mensajePasswordIncorrecta = (e as Error).message;
      }

      expect(mensajeEmailInexistente).toBe(mensajePasswordIncorrecta);
    });
  });

  describe("refrescar()", () => {
    it("rota el refresh token: revoca el usado y emite uno nuevo", async () => {
      const { usuarios, refreshTokens } = crearRepos();
      (refreshTokens.buscarValido as Mock).mockResolvedValue({ id: "rt-1", usuarioId: "usuario-1" });
      (usuarios.buscarPorId as Mock).mockResolvedValue(await usuarioDeEjemplo());
      const service = new AuthService(usuarios, refreshTokens);

      const resultado = await service.refrescar("token-viejo-plano");

      expect(refreshTokens.revocarPorId).toHaveBeenCalledWith("rt-1");
      expect(refreshTokens.crear).toHaveBeenCalledTimes(1); // el nuevo refresh token
      expect(typeof resultado.token).toBe("string");
      expect(typeof resultado.refreshToken).toBe("string");
    });

    it("lanza CredencialesInvalidasError si el refresh token es inválido/expirado/revocado", async () => {
      const { usuarios, refreshTokens } = crearRepos();
      (refreshTokens.buscarValido as Mock).mockResolvedValue(null);
      const service = new AuthService(usuarios, refreshTokens);

      await expect(service.refrescar("token-invalido")).rejects.toThrow(CredencialesInvalidasError);
      expect(refreshTokens.revocarPorId).not.toHaveBeenCalled();
    });

    it("lanza CredencialesInvalidasError si el usuario del token ya no existe", async () => {
      const { usuarios, refreshTokens } = crearRepos();
      (refreshTokens.buscarValido as Mock).mockResolvedValue({ id: "rt-1", usuarioId: "usuario-eliminado" });
      (usuarios.buscarPorId as Mock).mockResolvedValue(null);
      const service = new AuthService(usuarios, refreshTokens);

      await expect(service.refrescar("token-plano")).rejects.toThrow(CredencialesInvalidasError);
    });

    it("un refresh token usado una vez no puede reutilizarse (el mock refleja la revocación)", async () => {
      const { usuarios, refreshTokens } = crearRepos();
      (usuarios.buscarPorId as Mock).mockResolvedValue(await usuarioDeEjemplo());
      const service = new AuthService(usuarios, refreshTokens);

      // Primer uso: válido.
      (refreshTokens.buscarValido as Mock).mockResolvedValueOnce({ id: "rt-1", usuarioId: "usuario-1" });
      await service.refrescar("token-original");

      // Segundo uso del MISMO token: el repositorio (ya revocado) ahora devolvería null.
      (refreshTokens.buscarValido as Mock).mockResolvedValueOnce(null);
      await expect(service.refrescar("token-original")).rejects.toThrow(CredencialesInvalidasError);
    });
  });

  describe("logout()", () => {
    it("revoca el refresh token proporcionado", async () => {
      const { usuarios, refreshTokens } = crearRepos();
      const service = new AuthService(usuarios, refreshTokens);

      await service.logout("token-a-revocar");

      expect(refreshTokens.revocarPorToken).toHaveBeenCalledWith("token-a-revocar");
    });
  });
});
