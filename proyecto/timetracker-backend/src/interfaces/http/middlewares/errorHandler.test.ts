import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { errorHandler, asyncHandler } from "./errorHandler";
import { ValidacionError, NoAutorizadoError } from "../../../domain/errors/DomainError";

function crearRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("errorHandler", () => {
  it("mapea un DomainError a su httpStatus y code correspondiente", () => {
    const res = crearRes();
    const err = new ValidacionError("El campo X es obligatorio.");

    errorHandler(err, {} as Request, res, (() => {}) as NextFunction);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "VALIDACION", message: "El campo X es obligatorio.", details: undefined },
    });
  });

  it("mapea NoAutorizadoError a 403", () => {
    const res = crearRes();
    errorHandler(new NoAutorizadoError("No autorizado"), {} as Request, res, (() => {}) as NextFunction);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("incluye 'details' cuando el DomainError los trae", () => {
    const res = crearRes();
    const err = new ValidacionError("Error con detalle", { campo: "email" });
    errorHandler(err, {} as Request, res, (() => {}) as NextFunction);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "VALIDACION", message: "Error con detalle", details: { campo: "email" } },
    });
  });

  it("cualquier error no controlado (no DomainError) responde 500 genérico, sin filtrar el mensaje interno", () => {
    const res = crearRes();
    const errorInterno = new Error("detalle interno sensible de la base de datos");

    errorHandler(errorInterno, {} as Request, res, (() => {}) as NextFunction);

    expect(res.status).toHaveBeenCalledWith(500);
    const cuerpo = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(cuerpo.error.code).toBe("ERROR_INTERNO");
    expect(cuerpo.error.message).not.toContain("base de datos"); // no debe filtrar detalles internos
  });
});

describe("asyncHandler", () => {
  it("pasa el resultado exitoso sin llamar a next()", async () => {
    const handler = asyncHandler(async (_req, res) => {
      (res as unknown as { enviado: boolean }).enviado = true;
    });
    const res = { enviado: false } as unknown as Response;
    const next = vi.fn();

    handler({} as Request, res, next);
    await new Promise((resolve) => setImmediate(resolve)); // deja correr el microtask del handler async

    expect((res as unknown as { enviado: boolean }).enviado).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it("captura el rechazo de una promesa y lo pasa a next()", async () => {
    const errorEsperado = new Error("falló");
    const handler = asyncHandler(async () => {
      throw errorEsperado;
    });
    const next = vi.fn();

    handler({} as Request, {} as Response, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(errorEsperado);
  });
});
