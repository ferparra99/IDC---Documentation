export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

/** El intento de transición no es válido para el estado actual (patrón State). */
export class TransicionInvalidaError extends DomainError {
  readonly code = "TRANSICION_INVALIDA";
  readonly httpStatus = 409;
}

export class JornadaYaActivaError extends DomainError {
  readonly code = "JORNADA_YA_ACTIVA";
  readonly httpStatus = 409;
}

export class NoHayJornadaActivaError extends DomainError {
  readonly code = "NO_HAY_JORNADA_ACTIVA";
  readonly httpStatus = 409;
}

export class NoAutorizadoError extends DomainError {
  readonly code = "NO_AUTORIZADO";
  readonly httpStatus = 403;
}

export class NoEncontradoError extends DomainError {
  readonly code = "NO_ENCONTRADO";
  readonly httpStatus = 404;
}

export class ValidacionError extends DomainError {
  readonly code = "VALIDACION";
  readonly httpStatus = 422;
}

export class CredencialesInvalidasError extends DomainError {
  readonly code = "CREDENCIALES_INVALIDAS";
  readonly httpStatus = 401;
}
