import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { PermisoDTO } from "../api/types";
import { TopToolbar } from "../components/TopToolbar";

export function AdminLeavesPage() {
  const [permisos, setPermisos] = useState<PermisoDTO[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionId, setAccionId] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true); setError(null);
    try {
      const data = await api.get<PermisoDTO[]>("/leaves/pendientes");
      setPermisos(Array.isArray(data) ? data : (data as any).data ?? []);
    } catch (err) {
      // Fallback: intenta /leaves/admin y filtra ENVIADO si el endpoint pendientes no existe
      try {
        const data2 = await api.get<PermisoDTO[]>("/leaves/admin");
        const arr = Array.isArray(data2) ? data2 : (data2 as any).data ?? [];
        setPermisos(arr.filter((p: PermisoDTO) => p.estado === "ENVIADO"));
      } catch (e2) {
        setError(err instanceof ApiError ? err.message : "No se pudo cargar permisos.");
      }
    } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const aprobar = async (id: string) => {
    setAccionId(id); setError(null);
    try {
      await api.post(`/leaves/${id}/aprobar`);
      setPermisos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo aprobar.");
    } finally { setAccionId(null); }
  };

  const rechazar = async (id: string) => {
    setAccionId(id); setError(null);
    try {
      await api.post(`/leaves/${id}/rechazar`);
      setPermisos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo rechazar.");
    } finally { setAccionId(null); }
  };

  return (
    <div>
      <TopToolbar title="Gestión de permisos" subtitle="Solicitudes ENVIADAS por empleados - aprobar o rechazar" />
      <div style={{ maxWidth: 720 }}>
        {error && <div style={errSt}>{error}</div>}
        {cargando ? <p style={{ color:'var(--text-secondary)' }}>Cargando...</p> : permisos.length === 0 ? (
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:16, color:'var(--text-secondary)', fontSize:13 }}>
            No hay solicitudes pendientes.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {permisos.map(p => (
              <div key={p.id} style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:14, display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>{p.fechaSolicitud} · {p.tipo} · {p.horas}h</span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:9999, background:'var(--accent-primary-muted)', color:'var(--accent-primary)', fontWeight:700 }}>{p.estado}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--text-secondary)' }}>Usuario: <code style={{ fontSize:11 }}>{p.usuarioId.slice(0,8)}…</code></div>
                <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{p.descripcion}</div>
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  <button onClick={() => aprobar(p.id)} disabled={accionId===p.id} style={{ ...btnPri, flex:1, opacity: accionId===p.id?0.6:1 }}>
                    {accionId===p.id ? "…" : "Aprobar"}
                  </button>
                  <button onClick={() => rechazar(p.id)} disabled={accionId===p.id} style={{ ...btnDanger, flex:1 }}>
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={cargar} style={{ ...btnSec, marginTop:12 }}>Recargar</button>
      </div>
    </div>
  );
}

const btnPri: React.CSSProperties = { padding:'10px 12px', borderRadius:8, background:'var(--cta-bg)', color:'var(--cta-text)', border:'none', fontWeight:700, cursor:'pointer', fontSize:13 };
const btnDanger: React.CSSProperties = { padding:'10px 12px', borderRadius:8, background:'#7f1d1d', color:'#fff', border:'1px solid #991b1b', fontWeight:700, cursor:'pointer', fontSize:13 };
const btnSec: React.CSSProperties = { padding:'10px 16px', borderRadius:8, background:'var(--bg-surface)', color:'var(--text-primary)', border:'1px solid var(--border-subtle)', fontWeight:600, cursor:'pointer' };
const errSt: React.CSSProperties = { color:'var(--accent-danger)', fontSize:13, background:'var(--bg-surface)', padding:8, borderRadius:8, border:'1px solid var(--border-subtle)', marginBottom:12 };
