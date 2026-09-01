import { useState, FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { PermisoDTO, PreviewPermisoDTO, TipoPermiso } from "../api/types";

type Vista = "formulario" | "previsualizacion" | "enviado";

const FORM_VACIO = { fechaSolicitud: "", horas: "", tipo: "PARCIAL" as TipoPermiso, descripcion: "" };

export function LeavesPage() {
  const [vista, setVista] = useState<Vista>("formulario");
  const [form, setForm] = useState(FORM_VACIO);
  const [permisoId, setPermisoId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewPermisoDTO | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargarPreview = async (id: string) => {
    const data = await api.get<PreviewPermisoDTO>(`/leaves/${id}/preview`);
    setPreview(data);
    setVista("previsualizacion");
  };

  const onSubmitFormulario = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const dto = { ...form, horas: Number(form.horas) };
      const permiso: PermisoDTO = permisoId
        ? await api.put(`/leaves/${permisoId}`, dto)
        : await api.post("/leaves", dto);
      setPermisoId(permiso.id);
      await cargarPreview(permiso.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el permiso.");
    } finally {
      setCargando(false);
    }
  };

  const onEditar = () => {
    if (!preview) return;
    setForm({
      fechaSolicitud: preview.permiso.fechaSolicitud,
      horas: String(preview.permiso.horas),
      tipo: preview.permiso.tipo,
      descripcion: preview.permiso.descripcion,
    });
    setVista("formulario");
  };

  const onConfirmarEnvio = async () => {
    if (!permisoId) return;
    setCargando(true);
    setError(null);
    try {
      await api.post(`/leaves/${permisoId}/submit`);
      setConfirmando(false);
      setVista("enviado");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar el permiso.");
    } finally {
      setCargando(false);
    }
  };

  const nuevoPermiso = () => {
    setForm(FORM_VACIO);
    setPermisoId(null);
    setPreview(null);
    setVista("formulario");
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>Solicitud de permiso</h2>

      {vista === "formulario" && (
        <form onSubmit={onSubmitFormulario} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={etiqueta}>
            Día de solicitud
            <input
              type="date"
              required
              value={form.fechaSolicitud}
              onChange={(e) => setForm({ ...form, fechaSolicitud: e.target.value })}
              style={input}
            />
          </label>
          <label style={etiqueta}>
            Horas que tomará el permiso
            <input
              type="number"
              min={0.5}
              step={0.5}
              required
              value={form.horas}
              onChange={(e) => setForm({ ...form, horas: e.target.value })}
              style={input}
            />
          </label>
          <label style={etiqueta}>
            Tipo de permiso
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoPermiso })}
              style={input}
            >
              <option value="PARCIAL">Parcial</option>
              <option value="COMPLETO">Completo</option>
            </select>
          </label>
          <label style={etiqueta}>
            Descripción del permiso
            <textarea
              required
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              style={input}
            />
          </label>
          {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={cargando} style={botonPrimario}>
            {cargando ? "Guardando..." : "Previsualizar"}
          </button>
        </form>
      )}

      {vista === "previsualizacion" && preview && (
        <div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Empleado</h3>
            <p style={{ fontSize: 13 }}>
              {preview.empleado.nombre} — {preview.empleado.email}
            </p>
            <h3 style={{ fontSize: 14 }}>Permiso</h3>
            <ul style={{ fontSize: 13, paddingLeft: 18, margin: 0 }}>
              <li>Día: {preview.permiso.fechaSolicitud}</li>
              <li>Horas: {preview.permiso.horas}h</li>
              <li>Tipo: {preview.permiso.tipo}</li>
              <li>Descripción: {preview.permiso.descripcion}</li>
            </ul>
          </div>
          {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onEditar} style={botonSecundario}>Editar</button>
            <button onClick={() => setConfirmando(true)} style={botonPrimario}>Enviar</button>
          </div>
        </div>
      )}

      {vista === "enviado" && (
        <div>
          <p style={{ color: "#059669", fontSize: 14 }}>✓ Permiso enviado correctamente.</p>
          <button onClick={nuevoPermiso} style={botonSecundario}>Nueva solicitud</button>
        </div>
      )}

      {confirmando && (
        <div style={overlay}>
          <div style={modal}>
            <p style={{ marginTop: 0, fontSize: 14 }}>¿Confirmas el envío de esta solicitud de permiso?</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmando(false)} style={botonSecundario}>Cancelar</button>
              <button onClick={onConfirmarEnvio} disabled={cargando} style={botonPrimario}>
                {cargando ? "Enviando..." : "Confirmar envío"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const etiqueta: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#334155" };
const input: React.CSSProperties = { padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 };
const botonPrimario: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" };
const botonSecundario: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, background: "#e2e8f0", color: "#1e293b", border: "none", fontWeight: 600, cursor: "pointer" };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modal: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 20, width: "100%", maxWidth: 360 };
