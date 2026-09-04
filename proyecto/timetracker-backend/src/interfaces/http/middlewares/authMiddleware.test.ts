import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { authMiddleware, requiereRol } from "./authMiddleware";
import { env } from "../../../shared/config/env";

function crearRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function crearReq(headers: Record<string, string> = {}): Request {
  return { headers, usuario: undefined } as unknown as Request;
}

describe("authMiddleware", () => {
  it("responde 401 NO_AUTENTICADO si falta el header Authorization", () => {
    const req = crearReq();
    const res = crearRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: { code: "NO_AUTENTICADO", message: expect.any(String) } });
    expect(next).not.toHaveBeenCalled();
  });

  it("responde 401 NO_AUTENTICADO si el header no empieza con 'Bearer '", () => {
    const req = crearReq({ authorization: "Token abc123" });
    const res = crearRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0].error.code).toBe("NO_AUTENTICADO");
  });

  it("responde 401 TOKEN_INVALIDO si el token está mal formado o firmado con otro secreto", () => {
    const tokenAjeno = jwt.sign({ sub: "u1", rol: "empleado" }, "otro-secreto-distinto");
    const req = crearReq({ authorization: `Bearer ${tokenAjeno}` });
    const res = crearRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0].error.code).toBe("TOKEN_INVALIDO");
    expect(next).not.toHaveBeenCalled();
  });

  it("responde 401 TOKEN_INVALIDO si el token está expirado", () => {
    const tokenExpirado = jwt.sign({ sub: "u1", rol: "empleado" }, env.jwtSecret, { expiresIn: -10 });
    const req = crearReq({ authorization: `Bearer ${tokenExpirado}` });
    const res = crearRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("con un token válido, adjunta req.usuario y llama a next()", () => {
    const token = jwt.sign({ sub: "usuario-1", rol: "empleado" }, env.jwtSecret);
    const req = crearReq({ authorization: `Bearer ${token}` });
    const res = crearRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.usuario).toMatchObject({ sub: "usuario-1", rol: "empleado" });
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("requiereRol", () => {
  it("responde 403 si req.usuario no existe", () => {
    const req = crearReq();
    const res = crearRes();
    const next = vi.fn();

    requiereRol("administrador")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("responde 403 si el rol del usuario no está en la lista permitida", () => {
    const req = crearReq();
    req.usuario = { sub: "u1", rol: "empleado" };
    const res = crearRes();
    const next = vi.fn();

    requiereRol("administrador")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("llama a next() si el rol coincide", () => {
    const req = crearReq();
    req.usuario = { sub: "u1", rol: "administrador" };
    const res = crearRes();
    const next = vi.fn();

    requiereRol("administrador", "empleado")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
