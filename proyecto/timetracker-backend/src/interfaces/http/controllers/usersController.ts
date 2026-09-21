import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../../../infrastructure/db/pool";
import { UsuarioRepository } from "../../../infrastructure/repositories/UsuarioRepository";
import { ValidacionError } from "../../../domain/errors/DomainError";
import { aUsuarioPublico } from "../../../domain/entities/Usuario";

const usuarioRepository = new UsuarioRepository(pool);

export async function listar(req: Request, res: Response): Promise<void> {
  if (req.usuario!.rol !== "administrador") {
    const err: any = new Error("Se requiere rol administrador.");
    err.code = "NO_AUTORIZADO"; err.status = 403; throw err;
  }
  const usuarios = await usuarioRepository.listarTodos();
  res.status(200).json({ data: usuarios.map(aUsuarioPublico) });
}

export async function crear(req: Request, res: Response): Promise<void> {
  if (req.usuario!.rol !== "administrador") {
    const err: any = new Error("Se requiere rol administrador.");
    err.code = "NO_AUTORIZADO"; err.status = 403; throw err;
  }
  const { nombre, email, password, rol } = (req.body ?? {}) as Record<string, unknown>;
  if (!nombre || typeof nombre !== "string" || !nombre.trim()) throw new ValidacionError("El campo 'nombre' es obligatorio.");
  if (!email || typeof email !== "string" || !email.trim()) throw new ValidacionError("El campo 'email' es obligatorio.");
  if (!password || typeof password !== "string" || !password.trim()) throw new ValidacionError("El campo 'password' es obligatorio.");
  if ((password as string).length < 6) throw new ValidacionError("La contraseña debe tener al menos 6 caracteres.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email as string)) throw new ValidacionError("El email no es válido.");

  const rolFinal = (rol as string)?.toLowerCase() === "administrador" ? "administrador" as const : "empleado" as const;

  if (await usuarioRepository.existePorEmail((email as string).toLowerCase().trim())) {
    throw new ValidacionError("Ya existe un usuario con ese email.");
  }

  const hash = await bcrypt.hash(password as string, 10);
  const nuevo = await usuarioRepository.crear({
    nombre: (nombre as string).trim(),
    email: (email as string).toLowerCase().trim(),
    passwordHash: hash,
    rol: rolFinal,
    activo: true,
  });
  res.status(201).json({ data: aUsuarioPublico(nuevo) });
}
