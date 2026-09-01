import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { DiaCalendarioDTO, RegistroDTO, ResumenSemanalDTO } from "../api/types";
import { MonthCalendar } from "../components/MonthCalendar";
import { SummaryPanel } from "../components/SummaryPanel";
import { DraggableHoursBar } from "../components/DraggableHoursBar";
import { primerYUltimoDiaSemana, hoyYYYYMMDD, hhmmAMinutos, minutosAIsoBogota } from "../utils/fecha";

const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function CalendarPage() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [dias, setDias] = useState<DiaCalendarioDTO[]>([]);
  const [resumen, setResumen] = useState<ResumenSemanalDTO | null>(null);
  const [diaEditando, setDiaEditando] = useState<DiaCalendarioDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarCalendario = async () => {
    setError(null);
    try {
      const data = await api.get<DiaCalendarioDTO[]>(`/calendar?anio=${anio}&mes=${mes}`);
      setDias(data);

      const { lunes, domingo } = primerYUltimoDiaSemana(hoyYYYYMMDD());
      const resumenData = await api.get<ResumenSemanalDTO>(`/attendance/summary?desde=${lunes}&hasta=${domingo}`);
      setResumen(resumenData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar el calendario.");
    }
  };

  useEffect(() => {
    cargarCalendario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes]);

  const cambiarMes = (delta: number) => {
    let nuevoMes = mes + delta;
    let nuevoAnio = anio;
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
    if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio--; }
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button onClick={() => cambiarMes(-1)} style={botonSecundario}>←</button>
        <h2 style={{ fontSize: 18, margin: 0 }}>{NOMBRES_MES[mes - 1]} {anio}</h2>
        <button onClick={() => cambiarMes(1)} style={botonSecundario}>→</button>
      </div>

      <SummaryPanel resumen={resumen} />

      {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}

      <MonthCalendar anio={anio} mes={mes} dias={dias} onSeleccionarDia={setDiaEditando} />

      {diaEditando && (
        <EditarDiaModal
          dia={diaEditando}
          onCerrar={() => setDiaEditando(null)}
          onGuardado={() => {
            setDiaEditando(null);
            cargarCalendario();
          }}
        />
      )}
    </div>
  );
}

function EditarDiaModal({
  dia,
  onCerrar,
  onGuardado,
}: {
  dia: DiaCalendarioDTO;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [registro, setRegistro] = useState<RegistroDTO | null>(null);
  const [inicioMin, setInicioMin] = useState(8 * 60);
  const [finMin, setFinMin] = useState(17 * 60);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api
      .get<RegistroDTO[]>(`/attendance?desde=${dia.fecha}&hasta=${dia.fecha}`)
      .then((registros) => {
        const r = registros[0];
        if (r) {
          setRegistro(r);
          if (r.horaInicio24) setInicioMin(hhmmAMinutos(r.horaInicio24));
          if (r.horaFin24 && hhmmAMinutos(r.horaFin24) > (r.horaInicio24 ? hhmmAMinutos(r.horaInicio24) : 0)) {
            setFinMin(hhmmAMinutos(r.horaFin24));
          }
        }
      })
      .catch(() => setError("No se pudo cargar el detalle del día."));
  }, [dia.fecha]);

  const guardar = async () => {
    if (!registro) return;
    if (!motivo.trim()) {
      setError("El motivo de la corrección es obligatorio.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await api.put(`/attendance/${registro.id}`, {
        horaInicio: minutosAIsoBogota(dia.fecha, inicioMin),
        horaFin: minutosAIsoBogota(dia.fecha, finMin),
        motivo,
      });
      onGuardado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la corrección.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>
          Editar jornada — {dia.fecha}
          {dia.nombreFestivo && <span style={{ color: "#b91c1c", fontSize: 12 }}> ({dia.nombreFestivo})</span>}
        </h3>

        {!registro && !error && <p style={{ fontSize: 13, color: "#64748b" }}>Cargando...</p>}

        {registro && (
          <>
            <DraggableHoursBar inicioMin={inicioMin} finMin={finMin} onChange={(i, f) => { setInicioMin(i); setFinMin(f); }} />
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              Nota: esta vista edita jornadas que no cruzan la medianoche. Para jornadas que cruzan la medianoche, la corrección debe hacerse desde el backoffice.
            </p>
            <textarea
              placeholder="Motivo de la corrección (obligatorio, queda auditado)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              style={{ width: "100%", marginTop: 10, padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
            />
            {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={onCerrar} style={botonSecundario}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={botonPrimario}>
                {guardando ? "Guardando..." : "Guardar corrección"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const modal: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: 20, width: "100%", maxWidth: 420,
};
const botonPrimario: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer",
};
const botonSecundario: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, background: "#e2e8f0", color: "#1e293b", border: "none", fontWeight: 600, cursor: "pointer",
};
