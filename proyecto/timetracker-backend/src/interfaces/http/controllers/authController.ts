import { Request, Response } from "express";
import { container } from "../container";
import { ValidacionError } from "../../../domain/errors/DomainError";

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    throw new ValidacionError("Los campos 'email' y 'password' son obligatorios.");
  }

  const resultado = await container.authService.login(email, password);
  res.status(200).json({ data: resultado });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) {
    throw new ValidacionError("El campo 'refreshToken' es obligatorio.");
  }

  const resultado = await container.authService.refrescar(refreshToken);
  res.status(200).json({ data: resultado });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) {
    throw new ValidacionError("El campo 'refreshToken' es obligatorio.");
  }

  await container.authService.logout(refreshToken);
  res.status(204).send();
}
