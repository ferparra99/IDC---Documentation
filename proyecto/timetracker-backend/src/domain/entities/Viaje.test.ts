import { describe, it, expect } from "vitest";
import { Viaje } from "./Viaje";
import { NuevoViajeDTO } from "./ViajeTypes";
import { ValidacionError } from "../errors/DomainError";

const DTO_VALIDO: NuevoViajeDTO = {
  fecha: "2026-08-30",
  puntoPartida: "Oficina Bogotá",
  puntoFinal: "Cliente Zona Industrial",
  descripcion: "Visita técnica",
};

const VALOR_POR_DEFECTO = 5000;

describe("Viaje", () => {
  describe("crear()", () => {
    it("crea un viaje con el valor por defecto si no se especifica valor", () => {
      const viaje = Viaje.crear("id-1", "usuario-1", DTO_VALIDO, VALOR_POR_DEFECTO);
      expect(viaje.toProps().valor).toBe(VALOR_POR_DEFECTO);
    });

    it("usa el valor explícito del DTO si se proporciona (aunque sea distinto al default)", () => {
      const viaje = Viaje.crear("id-1", "usuario-1", { ...DTO_VALIDO, valor: 12000 }, VALOR_POR_DEFECTO);
      expect(viaje.toProps().valor).toBe(12000);
    });

    it("permite un valor de 0 explícito (viaje sin costo)", () => {
      const viaje = Viaje.crear("id-1", "usuario-1", { ...DTO_VALIDO, valor: 0 }, VALOR_POR_DEFECTO);
      expect(viaje.toProps().valor).toBe(0);
    });

    it("recorta espacios en blanco de los campos de texto", () => {
      const viaje = Viaje.crear(
        "id-1",
        "usuario-1",
        { ...DTO_VALIDO, puntoPartida: "  Bogotá  ", puntoFinal: "  Medellín  ", descripcion: "  motivo  " },
        VALOR_POR_DEFECTO
      );
      const props = viaje.toProps();
      expect(props.puntoPartida).toBe("Bogotá");
      expect(props.puntoFinal).toBe("Medellín");
      expect(props.descripcion).toBe("motivo");
    });

    it.each([
      ["fecha vacía", { ...DTO_VALIDO, fecha: "" }],
      ["fecha con formato inválido", { ...DTO_VALIDO, fecha: "30/08/2026" }],
      ["puntoPartida vacío", { ...DTO_VALIDO, puntoPartida: "" }],
      ["puntoPartida solo espacios", { ...DTO_VALIDO, puntoPartida: "   " }],
      ["puntoFinal vacío", { ...DTO_VALIDO, puntoFinal: "" }],
      ["descripción vacía", { ...DTO_VALIDO, descripcion: "" }],
      ["valor negativo", { ...DTO_VALIDO, valor: -100 }],
    ])("rechaza: %s", (_nombre, dto) => {
      expect(() => Viaje.crear("id-1", "usuario-1", dto, VALOR_POR_DEFECTO)).toThrow(ValidacionError);
    });
  });

  describe("editar()", () => {
    it("actualiza los campos y vuelve a aplicar el valor por defecto si se omite", () => {
      const viaje = Viaje.crear("id-1", "usuario-1", { ...DTO_VALIDO, valor: 9000 }, VALOR_POR_DEFECTO);
      viaje.editar({ ...DTO_VALIDO, descripcion: "Motivo actualizado" }, VALOR_POR_DEFECTO);
      const props = viaje.toProps();
      expect(props.descripcion).toBe("Motivo actualizado");
      expect(props.valor).toBe(VALOR_POR_DEFECTO); // al omitir 'valor' en editar(), se resetea al default
    });

    it("valida el nuevo DTO igual que crear()", () => {
      const viaje = Viaje.crear("id-1", "usuario-1", DTO_VALIDO, VALOR_POR_DEFECTO);
      expect(() => viaje.editar({ ...DTO_VALIDO, puntoFinal: "" }, VALOR_POR_DEFECTO)).toThrow(ValidacionError);
    });
  });

  describe("desdeProps()", () => {
    it("reconstruye una entidad a partir de props ya persistidas", () => {
      const viaje = Viaje.desdeProps({
        id: "id-1",
        usuarioId: "usuario-1",
        fecha: "2026-08-30",
        puntoPartida: "A",
        puntoFinal: "B",
        descripcion: "motivo",
        valor: 7000,
      });
      expect(viaje.toProps().valor).toBe(7000);
    });
  });
});
