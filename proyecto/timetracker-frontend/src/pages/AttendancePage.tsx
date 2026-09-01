import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { RegistroDTO, EstadoJornada } from "../api/types";

export function AttendancePage() {
  const [estado, setEstado] = useState<EstadoJornada>("SIN_INICIAR");
  const [registro, setRegistro] = useState<RegistroDTO | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargarEstado = async () => {
    const data = await api.get<{ estado: EstadoJornada; registro: RegistroDTO | null }>("/attendance/today");
    setEstado(data.estado);
    setRegistro(data.registro);
  };

  useEffect(() => {
    cargarEstado();
  }, []);

  const iniciar = async () => {
    setCargando(true);
    setMensaje(null);
    try {
      await api.post("/attendance/start");
      await cargarEstado();
    } catch (err) {
      setMensaje(err instanceof ApiError ? err.message : "Error al iniciar jornada.");
    } finally {
      setCargando(false);
    }
  };

  const finalizar = async () => {
    if (!descripcion.trim()) {
      setMensaje("Describe el/los proyecto(s) trabajados antes de finalizar.");
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      await api.post("/attendance/finish", { descripcionProyectos: descripcion });
      setDescripcion("");
      await cargarEstado();
    } catch (err) {
      setMensaje(err instanceof ApiError ? err.message : "Error al finalizar jornada.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>Fichaje de hoy</h2>
      <p style={{ fontSize: 13, color: "#64748b" }}>
        Estado actual: <strong>{estado}</strong>
        {registro?.horaInicio24 && ` — inicio ${registro.horaInicio24}`}
        {registro?.horaFin24 && ` — fin ${registro.horaFin24}`}
      </p>

      {estado === "SIN_INICIAR" && (
        <button onClick={iniciar} disabled={cargando} style={botonPrimario}>
          Iniciar jornada
        </button>
      )}

      {estado === "JORNADA_ACTIVA" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <textarea
            placeholder="Descripción del/los proyecto(s) trabajados hoy"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
          <button onClick={finalizar} disabled={cargando} style={botonPrimario}>
            Finalizar jornada
          </button>
        </div>
      )}

      {estado === "JORNADA_FINALIZADA" && (
        <div style={{ fontSize: 13, color: "#059669", marginTop: 8 }}>
          Ya registraste tu jornada de hoy. Total: {(
            (registro?.horasOrdinarias ?? 0) +
            (registro?.horasExtraDiurnas ?? 0) +
            (registro?.horasExtraNocturnas ?? 0) +
            (registro?.horasRecargoNocturno ?? 0) +
            (registro?.horasDominicalFestivo ?? 0)
          ).toFixed(2)}h
        </div>
      )}

      {mensaje && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{mensaje}</p>}
    </div>
  );
}

const botonPrimario: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  background: "#1d4ed8",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  cursor: "pointer",
};
