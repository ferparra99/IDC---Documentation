import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RegistroJornada } from "./RegistroJornada";
import { nuevoRegistroJornada } from "./RegistroJornadaTypes";
import { TransicionInvalidaError, ValidacionError } from "../errors/DomainError";
import { ConfiguracionVigente } from "../services/ConfiguracionVigente";

const CONFIG: ConfiguracionVigente = {
  inicioHorarioNocturno: "19:00",
  finHorarioNocturno: "06:00",
  horasOrdinariasPorDia: 8,
};

function crearRegistroSinIniciar(fecha = "2026-08-31") {
  const props = nuevoRegistroJornada("usuario-1", fecha);
  return RegistroJornada.crear(props, CONFIG, false);
}

/** Avanza el reloj falso para que iniciar()/finalizar() no capturen el mismo instante. */
function avanzarUnaHora() {
  vi.advanceTimersByTime(60 * 60 * 1000);
}

describe("RegistroJornada (patrón State)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T13:00:00Z")); // 08:00 Bogotá
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("desde SIN_INICIAR", () => {
    it("iniciar() transiciona a JORNADA_ACTIVA y captura hora de inicio", () => {
      const entidad = crearRegistroSinIniciar();
      entidad.iniciar();
      const props = entidad.toProps();
      expect(props.estado).toBe("JORNADA_ACTIVA");
      expect(props.horaInicio).toBeInstanceOf(Date);
    });

    it("finalizar() sin haber iniciado lanza TransicionInvalidaError", () => {
      const entidad = crearRegistroSinIniciar();
      expect(() => entidad.finalizar("proyecto X")).toThrow(TransicionInvalidaError);
    });
  });

  describe("desde JORNADA_ACTIVA", () => {
    function crearRegistroActivo() {
      const entidad = crearRegistroSinIniciar();
      entidad.iniciar();
      avanzarUnaHora();
      return entidad;
    }

    it("iniciar() de nuevo lanza TransicionInvalidaError (no se puede reiniciar una jornada activa)", () => {
      const entidad = crearRegistroActivo();
      expect(() => entidad.iniciar()).toThrow(TransicionInvalidaError);
    });

    it("finalizar() sin descripción lanza ValidacionError", () => {
      const entidad = crearRegistroActivo();
      expect(() => entidad.finalizar("")).toThrow(ValidacionError);
      expect(() => entidad.finalizar("   ")).toThrow(ValidacionError);
    });

    it("finalizar() con descripción transiciona a JORNADA_FINALIZADA y calcula horas", () => {
      const entidad = crearRegistroActivo();
      entidad.finalizar("Proyecto Facturación");
      const props = entidad.toProps();
      expect(props.estado).toBe("JORNADA_FINALIZADA");
      expect(props.descripcionProyectos).toBe("Proyecto Facturación");
      expect(props.horaFin).toBeInstanceOf(Date);
      // Se calculó algo de horas (no quedaron todas en 0), sin acoplarse al valor exacto
      // (eso ya lo cubre CalculadoraHorasService.test.ts en detalle).
      const total =
        props.horasOrdinarias + props.horasExtraDiurnas + props.horasExtraNocturnas + props.horasRecargoNocturno;
      expect(total).toBeGreaterThan(0);
    });

    it("recorta espacios en blanco de la descripción de proyectos", () => {
      const entidad = crearRegistroActivo();
      entidad.finalizar("  Proyecto con espacios  ");
      expect(entidad.toProps().descripcionProyectos).toBe("Proyecto con espacios");
    });
  });

  describe("desde JORNADA_FINALIZADA", () => {
    function crearRegistroFinalizado() {
      const entidad = crearRegistroSinIniciar();
      entidad.iniciar();
      avanzarUnaHora();
      entidad.finalizar("Proyecto Y");
      return entidad;
    }

    it("iniciar() lanza TransicionInvalidaError (es un estado terminal para el patrón State)", () => {
      const entidad = crearRegistroFinalizado();
      expect(() => entidad.iniciar()).toThrow(TransicionInvalidaError);
    });

    it("finalizar() de nuevo lanza TransicionInvalidaError", () => {
      const entidad = crearRegistroFinalizado();
      expect(() => entidad.finalizar("otra descripción")).toThrow(TransicionInvalidaError);
    });

    it("editarManualmente() SÍ está permitido (no es una transición de estado)", () => {
      const entidad = crearRegistroFinalizado();
      const nuevoInicio = new Date("2026-08-31T13:00:00Z");
      const nuevoFin = new Date("2026-08-31T22:00:00Z");
      entidad.editarManualmente(nuevoInicio, nuevoFin);
      const props = entidad.toProps();
      expect(props.estado).toBe("JORNADA_FINALIZADA"); // el estado no cambia
      expect(props.horaInicio).toEqual(nuevoInicio);
      expect(props.horaFin).toEqual(nuevoFin);
      expect(props.editadoManualmente).toBe(true);
      expect(props.horasOrdinarias + props.horasExtraDiurnas).toBeGreaterThan(0); // se recalculó
    });
  });

  describe("editarManualmente() en estados donde no aplica", () => {
    it("lanza TransicionInvalidaError si el registro está SIN_INICIAR", () => {
      const entidad = crearRegistroSinIniciar();
      expect(() =>
        entidad.editarManualmente(new Date("2026-08-31T13:00:00Z"), new Date("2026-08-31T22:00:00Z"))
      ).toThrow(TransicionInvalidaError);
    });

    it("lanza TransicionInvalidaError si el registro está JORNADA_ACTIVA", () => {
      const entidad = crearRegistroSinIniciar();
      entidad.iniciar();
      expect(() =>
        entidad.editarManualmente(new Date("2026-08-31T13:00:00Z"), new Date("2026-08-31T22:00:00Z"))
      ).toThrow(TransicionInvalidaError);
    });
  });

  describe("cálculo dominical/festivo", () => {
    it("si esDominicalOFestivo=true, todas las horas caen en horasDominicalFestivo", () => {
      const props = nuevoRegistroJornada("usuario-1", "2026-08-30"); // domingo
      const entidad = RegistroJornada.crear(props, CONFIG, true);
      entidad.iniciar();
      avanzarUnaHora();
      entidad.finalizar("Trabajo en domingo");
      const resultado = entidad.toProps();
      expect(resultado.horasDominicalFestivo).toBeGreaterThan(0);
      expect(resultado.horasOrdinarias).toBe(0);
    });
  });
});
