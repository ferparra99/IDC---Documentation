import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { ViajeDTO } from "../api/types";
import { hoyYYYYMMDD } from "../utils/fecha";

interface ConfigItem { clave: string; valor: unknown }

const FORM_VACIO = { puntoPartida: "", puntoFinal: "", descripcion: "", valor: "" };

export function TripsPage() {
  const [fecha, setFecha] = useState(hoyYYYYMMDD());
  const [viajes, setViajes] = useState<ViajeDTO[]>([]);
  const [valorPorDefecto, setValorPorDefecto] = useState(5000);
  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    api.get<ConfigItem[]>("/config").then((items) => {
      const item = items.find((i) => i.clave === "valorViajePorDefecto");
      if (item) setValorPorDefecto(Number(item.valor));
    });
  }, []);

  const cargarViajes = async () => {
    setError(null);
    try {
      const data = await api.get<ViajeDTO[]>(`/trips?desde=${fecha}&hasta=${fecha}`);
      setViajes(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los viajes.");
    }
  };

  useEffect(() => {
    cargarViajes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  const iniciarNuevo = () => {
    setEditandoId(null);
    setForm({ ...FORM_VACIO, valor: String(valorPorDefecto) });
  };

  useEffect(() => { iniciarNuevo(); }, [valorPorDefecto]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const dto = {
        fecha,
        puntoPartida: form.puntoPartida,
        puntoFinal: form.puntoFinal,
        descripcion: form.descripcion,
        valor: form.valor === "" ? undefined : Number(form.valor),
      };
      if (editandoId) {
        await api.put(`/trips/${editandoId}`, dto);
      } else {
        await api.post("/trips", dto);
      }
      iniciarNuevo();
      await cargarViajes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el viaje.");
    } finally {
      setCargando(false);
    }
  };

  const onEditar = (v: ViajeDTO) => {
    setEditandoId(v.id);
    setForm({ puntoPartida: v.puntoPartida, puntoFinal: v.puntoFinal, descripcion: v.descripcion, valor: String(v.valor) });
  };

  const onEliminar = async (id: string) => {
    setCargando(true);
    try {
      await api.delete(`/trips/${id}`);
      await cargarViajes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el viaje.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>Viajes / desplazamientos</h2>

      <label style={{ ...etiqueta, maxWidth: 200 }}>
        Día
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={input} />
      </label>

      <div style={{ margin: "16px 0" }}>
        {viajes.length === 0 && <p style={{ fontSize: 13, color: "#64748b" }}>Sin viajes registrados este día.</p>}
        {viajes.map((v) => (
          <div key={v.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13 }}>
              <strong>{v.puntoPartida} → {v.puntoFinal}</strong>
              <div style={{ color: "#64748b" }}>{v.descripcion}</div>
              <div style={{ color: "#059669", fontWeight: 600 }}>${v.valor.toLocaleString("es-CO")}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onEditar(v)} style={botonSecundario}>Editar</button>
              <button onClick={() => onEliminar(v.id)} style={botonPeligro}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 15 }}>{editandoId ? "Editar viaje" : "Nuevo viaje"}</h3>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={etiqueta}>
          Punto de partida
          <input required value={form.puntoPartida} onChange={(e) => setForm({ ...form, puntoPartida: e.target.value })} style={input} />
        </label>
        <label style={etiqueta}>
          Punto final
          <input required value={form.puntoFinal} onChange={(e) => setForm({ ...form, puntoFinal: e.target.value })} style={input} />
        </label>
        <label style={etiqueta}>
          Descripción / motivo del viaje
          <textarea required rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} style={input} />
        </label>
        <label style={etiqueta}>
          Valor (editable — por defecto ${valorPorDefecto.toLocaleString("es-CO")})
          <input type="number" min={0} step={100} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} style={input} />
        </label>
        {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={cargando} style={botonPrimario}>
            {cargando ? "Guardando..." : editandoId ? "Guardar cambios" : "Agregar viaje"}
          </button>
          {editandoId && <button type="button" onClick={iniciarNuevo} style={botonSecundario}>Cancelar edición</button>}
        </div>
      </form>
    </div>
  );
}

const etiqueta: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#334155" };
const input: React.CSSProperties = { padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 };
const botonPrimario: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" };
const botonSecundario: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, background: "#e2e8f0", color: "#1e293b", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 12 };
const botonPeligro: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 12 };
