import { describe, it, expect } from "vitest";
import { Permiso } from "./Permiso";
import { NuevoPermisoDTO } from "./PermisoTypes";
import { TransicionInvalidaError, ValidacionError } from "../errors/DomainError";

const DTO_VALIDO: NuevoPermisoDTO = {
  fechaSolicitud: "2026-09-02",
  horas: 4,
  tipo: "PARCIAL",
  descripcion: "Cita médica",
};

describe("Permiso", () => {
  describe("crear()", () => {
    it("crea un permiso en estado BORRADOR con datos válidos", () => {
      const permiso = Permiso.crear("id-1", "usuario-1", DTO_VALIDO);
      const props = permiso.toProps();
      expect(props.estado).toBe("BORRADOR");
      expect(props.horas).toBe(4);
      expect(props.tipo).toBe("PARCIAL");
    });

    it("recorta espacios en blanco de la descripción", () => {
      const permiso = Permiso.crear("id-1", "usuario-1", { ...DTO_VALIDO, descripcion: "  con espacios  " });
      expect(permiso.toProps().descripcion).toBe("con espacios");
    });

    it.each([
      ["fechaSolicitud vacía", { ...DTO_VALIDO, fechaSolicitud: "" }],
      ["fechaSolicitud con formato inválido", { ...DTO_VALIDO, fechaSolicitud: "02-09-2026" }],
      ["horas en cero", { ...DTO_VALIDO, horas: 0 }],
      ["horas negativas", { ...DTO_VALIDO, horas: -1 }],
      ["tipo inválido", { ...DTO_VALIDO, tipo: "OTRO" as never }],
      ["descripción vacía", { ...DTO_VALIDO, descripcion: "" }],
      ["descripción solo espacios", { ...DTO_VALIDO, descripcion: "   " }],
      ["permiso COMPLETO de más de 24h", { ...DTO_VALIDO, tipo: "COMPLETO" as const, horas: 25 }],
    ])("rechaza: %s", (_nombre, dto) => {
      expect(() => Permiso.crear("id-1", "usuario-1", dto)).toThrow(ValidacionError);
    });

    it("acepta un permiso COMPLETO de exactamente 24h", () => {
      expect(() =>
        Permiso.crear("id-1", "usuario-1", { ...DTO_VALIDO, tipo: "COMPLETO", horas: 24 })
      ).not.toThrow();
    });
  });

  describe("editar()", () => {
    it("permite editar mientras está en BORRADOR", () => {
      const permiso = Permiso.crear("id-1", "usuario-1", DTO_VALIDO);
      permiso.editar({ ...DTO_VALIDO, horas: 6, descripcion: "Cita médica actualizada" });
      const props = permiso.toProps();
      expect(props.horas).toBe(6);
      expect(props.descripcion).toBe("Cita médica actualizada");
    });

    it("lanza TransicionInvalidaError si ya fue ENVIADO", () => {
      const permiso = Permiso.crear("id-1", "usuario-1", DTO_VALIDO);
      permiso.enviar();
      expect(() => permiso.editar({ ...DTO_VALIDO, horas: 6 })).toThrow(TransicionInvalidaError);
    });

    it("valida el nuevo DTO igual que crear()", () => {
      const permiso = Permiso.crear("id-1", "usuario-1", DTO_VALIDO);
      expect(() => permiso.editar({ ...DTO_VALIDO, horas: -5 })).toThrow(ValidacionError);
    });
  });

  describe("enviar()", () => {
    it("transiciona de BORRADOR a ENVIADO", () => {
      const permiso = Permiso.crear("id-1", "usuario-1", DTO_VALIDO);
      permiso.enviar();
      expect(permiso.toProps().estado).toBe("ENVIADO");
    });

    it("lanza TransicionInvalidaError si se envía dos veces", () => {
      const permiso = Permiso.crear("id-1", "usuario-1", DTO_VALIDO);
      permiso.enviar();
      expect(() => permiso.enviar()).toThrow(TransicionInvalidaError);
    });
  });

  describe("desdeProps()", () => {
    it("reconstruye una entidad a partir de props ya persistidas", () => {
      const permiso = Permiso.desdeProps({
        id: "id-1",
        usuarioId: "usuario-1",
        fechaSolicitud: "2026-09-02",
        horas: 4,
        tipo: "PARCIAL",
        descripcion: "Cita médica",
        estado: "ENVIADO",
      });
      expect(permiso.toProps().estado).toBe("ENVIADO");
      expect(() => permiso.enviar()).toThrow(TransicionInvalidaError);
    });
  });
});
