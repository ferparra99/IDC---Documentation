import { useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { primerYUltimoDiaSemana, hoyYYYYMMDD } from "../utils/fecha";
import { TopToolbar } from "../components/TopToolbar";

function primerDiaMes():string{ const h=hoyYYYYMMDD(); return `${h.slice(0,7)}-01`; }

export function ReportsPage(){
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol==="administrador";
  const { domingo } = primerYUltimoDiaSemana(hoyYYYYMMDD());
  const [desde,setDesde]=useState(primerDiaMes());
  const [hasta,setHasta]=useState(domingo);
  const [soloYo,setSoloYo]=useState(!esAdmin);
  const [error,setError]=useState<string|null>(null);
  const [cargando,setCargando]=useState(false);

  const descargar=async()=>{
    setError(null); setCargando(true);
    try{ const param = !esAdmin||soloYo ? `&usuarioId=${usuario!.id}` : ""; const blob=await api.getBlob(`/reports/excel?desde=${desde}&hasta=${hasta}${param}`); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`reporte_${desde}_a_${hasta}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
    catch(err){ setError(err instanceof ApiError?err.message:"No se pudo generar reporte."); } finally{ setCargando(false); }
  };

  return (
    <div>
      <TopToolbar title="Reportes" subtitle='Hojas "Horas laboradas" y "Viajes laborados" (.xlsx)' />
      <div style={{ maxWidth:480, background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:16, display:'flex', flexDirection:'column', gap:12 }}>
        <label style={eti}>Desde<input type="date" value={desde} onChange={e=>setDesde(e.target.value)} style={inp} /></label>
        <label style={eti}>Hasta<input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} style={inp} /></label>
        {esAdmin && <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-secondary)' }}><input type="checkbox" checked={soloYo} onChange={e=>setSoloYo(e.target.checked)} /> Solo mis registros (desmarca para consolidado)</label>}
        {error && <p style={errSt}>{error}</p>}
        <button onClick={descargar} disabled={cargando} style={btnPri}>{cargando?"Generando...":"Descargar Excel"}</button>
      </div>
    </div>
  );
}
const eti:React.CSSProperties={ display:'flex', flexDirection:'column', gap:6, fontSize:13, color:'var(--text-secondary)' };
const inp:React.CSSProperties={ padding:10, borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-base)', color:'var(--text-primary)', fontSize:16 };
const btnPri:React.CSSProperties={ padding:'12px 16px', borderRadius:8, background:'var(--cta-bg)', color:'var(--cta-text)', border:'none', fontWeight:700, cursor:'pointer', width:'100%' };
const errSt:React.CSSProperties={ color:'var(--accent-danger)', fontSize:13, background:'var(--bg-base)', padding:8, borderRadius:8, border:'1px solid var(--border-subtle)' };
