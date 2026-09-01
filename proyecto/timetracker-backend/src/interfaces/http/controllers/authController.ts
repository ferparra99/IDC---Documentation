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
