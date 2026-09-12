import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { RegistroDTO, EstadoJornada } from "../api/types";
import { TopToolbar } from "../components/TopToolbar";

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
  useEffect(() => { cargarEstado(); }, []);

  const iniciar = async () => {
    setCargando(true); setMensaje(null);
    try { await api.post("/attendance/start"); await cargarEstado(); }
    catch (err) { setMensaje(err instanceof ApiError ? err.message : "Error al iniciar."); }
    finally { setCargando(false); }
  };
  const finalizar = async () => {
    if (!descripcion.trim()) { setMensaje("Describe proyectos antes de finalizar."); return; }
    setCargando(true); setMensaje(null);
    try { await api.post("/attendance/finish", { descripcionProyectos: descripcion }); setDescripcion(""); await cargarEstado(); }
    catch (err) { setMensaje(err instanceof ApiError ? err.message : "Error al finalizar."); }
    finally { setCargando(false); }
  };

  const puedeIniciar = estado === "SIN_INICIAR";
  const puedeFinalizar = estado === "JORNADA_ACTIVA";

  return (
    <div>
      <TopToolbar title="Fichaje de hoy" subtitle={`Estado: ${estado}${registro?.horaInicio24 ? ` · inicio ${registro.horaInicio24}` : ''}${registro?.horaFin24 ? ` · fin ${registro.horaFin24}` : ''}`} />
      <div style={{ maxWidth: 520, display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <button onClick={iniciar} disabled={!puedeIniciar || cargando}
            style={{ ...btnPri, opacity: puedeIniciar?1:0.45, cursor: puedeIniciar?'pointer':'not-allowed', flex:'1 1 200px' }}>
            Iniciar jornada
          </button>
          <button onClick={finalizar} disabled={!puedeFinalizar || cargando}
            style={{ ...btnSec, opacity: puedeFinalizar?1:0.45, cursor: puedeFinalizar?'pointer':'not-allowed', flex:'1 1 200px' }}>
            Finalizar jornada
          </button>
        </div>

        <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:16 }}>
          <div style={{ fontSize:12, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Descripción de proyectos</div>
          <textarea
            placeholder="Describe el/los proyecto(s) trabajados hoy"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            disabled={!puedeFinalizar}
            style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid var(--border-subtle)', background: puedeFinalizar?'var(--bg-base)':'var(--bg-surface-hover)', color:'var(--text-primary)', fontSize:16, opacity: puedeFinalizar?1:0.6 }}
          />
          <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:6 }}>Requerido solo al finalizar. Queda auditado.</div>
        </div>

        {estado === "JORNADA_FINALIZADA" && (
          <div style={{ background:'#16302A', border:'1px solid #6FCB9A', borderLeft:'3px solid #6FCB9A', borderRadius:10, padding:12, color:'#A8E9C4', fontSize:13 }}>
            ✓ Jornada finalizada · Total {((registro?.horasOrdinarias??0)+(registro?.horasExtraDiurnas??0)+(registro?.horasExtraNocturnas??0)+(registro?.horasRecargoNocturno??0)+(registro?.horasDominicalFestivo??0)).toFixed(2)}h
            <div style={{ height:6, background:'rgba(255,255,255,0.2)', borderRadius:9999, marginTop:8, overflow:'hidden' }}>
              <div style={{ width:`${Math.min(100, (((registro?.horasOrdinarias??0)/8)*100))}%`, height:'100%', background:'#6FCB9A' }} />
            </div>
          </div>
        )}
        {mensaje && <p style={{ color:'var(--accent-danger)', fontSize:13, background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', padding:10, borderRadius:8 }}>{mensaje}</p>}
      </div>
    </div>
  );
}

const btnPri: React.CSSProperties = { padding:"12px 16px", borderRadius:8, background:"var(--cta-bg)", color:"var(--cta-text)", border:"none", fontWeight:700, cursor:"pointer" };
const btnSec: React.CSSProperties = { padding:"12px 16px", borderRadius:8, background:"var(--bg-surface)", color:"var(--text-primary)", border:"1px solid var(--border-subtle)", fontWeight:600, cursor:"pointer" };
