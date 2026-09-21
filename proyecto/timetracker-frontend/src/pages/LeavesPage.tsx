import { useState, FormEvent, useEffect } from "react";
import { api, ApiError } from "../api/client";
import { PermisoDTO, PreviewPermisoDTO, TipoPermiso } from "../api/types";
import { TopToolbar } from "../components/TopToolbar";

type Vista = "formulario" | "previsualizacion" | "enviado";
const FORM_VACIO = { fechaSolicitud: "", horas: "", tipo: "PARCIAL" as TipoPermiso, descripcion: "" };

function colorEstado(estado: string): { bg: string; color: string; label: string } {
  switch (estado) {
    case "BORRADOR": return { bg: "var(--bg-surface)", color: "var(--text-tertiary)", label: "Borrador" };
    case "ENVIADO": return { bg: "#FEF3C7", color: "#92400E", label: "Enviado · pendiente" };
    case "APROBADO": return { bg: "#DCFCE7", color: "#166534", label: "Aprobado ✓" };
    case "RECHAZADO": return { bg: "#FEE2E2", color: "#991B1B", label: "Rechazado ✕" };
    default: return { bg: "var(--bg-surface)", color: "var(--text-secondary)", label: estado };
  }
}

export function LeavesPage() {
  const [vista, setVista] = useState<Vista>("formulario");
  const [form, setForm] = useState(FORM_VACIO);
  const [permisoId, setPermisoId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewPermisoDTO | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);
  const [historial, setHistorial] = useState<PermisoDTO[]>([]);
  const [cargandoHist, setCargandoHist] = useState(true);

  const cargarPreview = async (id:string)=>{ const data=await api.get<PreviewPermisoDTO>(`/leaves/${id}/preview`); setPreview(data); setVista("previsualizacion"); };
  const cargarHistorial = async () => {
    setCargandoHist(true);
    try {
      const data = await api.get<PermisoDTO[]>("/leaves");
      const arr = Array.isArray(data) ? data : (data as any).data ?? [];
      setHistorial(arr);
    } catch { /* silencioso */ } finally { setCargandoHist(false); }
  };
  useEffect(() => { cargarHistorial(); }, []);
  const onSubmit = async (e:FormEvent)=>{
    e.preventDefault(); setError(null); setExito(null); setCargando(true);
    try{
      const esCompleto = form.tipo === "COMPLETO";
      const horasEnvio = esCompleto ? 8 : Number(form.horas);
      const dto={...form, horas:horasEnvio};
      const p:PermisoDTO = permisoId ? await api.put(`/leaves/${permisoId}`, dto) : await api.post("/leaves", dto);
      setPermisoId(p.id); await cargarPreview(p.id);
    }
    catch(err){ setError(err instanceof ApiError?err.message:"No se pudo guardar."); } finally{ setCargando(false); }
  };
  const onEditar = ()=>{ if(!preview) return; setForm({ fechaSolicitud: preview.permiso.fechaSolicitud, horas:String(preview.permiso.horas), tipo: preview.permiso.tipo, descripcion: preview.permiso.descripcion }); setVista("formulario"); };
  const onConfirmar = async ()=>{
    if(!permisoId) return; setCargando(true); setError(null); setExito(null);
    try{
      await api.post(`/leaves/${permisoId}/submit`);
      setConfirmando(false);
      setVista("enviado");
      setExito("✓ Permiso enviado correctamente. Recibirás confirmación del administrador.");
      cargarHistorial();
    }
    catch(err){
      const msg = err instanceof ApiError ? err.message : "No se pudo enviar.";
      // Si ya estaba enviado, tratarlo como éxito para evitar confusión del doble click
      if(msg.toLowerCase().includes("ya enviado")){
        setConfirmando(false);
        setVista("enviado");
        setExito("✓ Permiso ya estaba enviado.");
      } else {
        setError(msg);
      }
    } finally{ setCargando(false); }
  };
  const nuevo = ()=>{ setForm(FORM_VACIO); setPermisoId(null); setPreview(null); setVista("formulario"); setError(null); setExito(null); };

  return (
    <div>
      <TopToolbar title="Permisos" subtitle="Solicitud → previsualización → envío" />
      <div style={{ maxWidth:560 }}>
        {exito && vista!=="enviado" && <div style={{ background:'#16302A', border:'1px solid #6FCB9A', borderRadius:10, padding:12, color:'#A8E9C4', fontSize:13, marginBottom:12 }}>{exito}</div>}
        {vista==="formulario" && (
          <form onSubmit={onSubmit} style={{ display:"flex", flexDirection:"column", gap:12, background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:16 }}>
            <label style={eti}>Día de solicitud<input type="date" required value={form.fechaSolicitud} onChange={e=>setForm({...form, fechaSolicitud:e.target.value})} style={inp} /></label>
            <label style={eti}>Tipo<select value={form.tipo} onChange={e=>{
              const v=e.target.value as TipoPermiso;
              setForm(f=>({...f, tipo:v, horas: v==="COMPLETO" ? "8" : f.horas}));
            }} style={inp}><option value="PARCIAL">Parcial</option><option value="COMPLETO">Completo</option></select></label>
            <label style={{...eti, opacity: form.tipo==="COMPLETO"?0.6:1}}>Horas
              <input type="number" min={0.5} step={0.5} required={form.tipo!=="COMPLETO"} disabled={form.tipo==="COMPLETO"} value={form.tipo==="COMPLETO" ? "8" : form.horas} onChange={e=>setForm({...form, horas:e.target.value})} style={{...inp, opacity: form.tipo==="COMPLETO"?0.6:1}} />
              {form.tipo==="COMPLETO" && <span style={{fontSize:11, color:'var(--text-tertiary)'}}>Completo = 8h fijas, no requiere especificar horas.</span>}
            </label>
            <label style={eti}>Descripción<textarea required rows={3} value={form.descripcion} onChange={e=>setForm({...form, descripcion:e.target.value})} style={{...inp, resize:'vertical', minHeight:80, maxHeight:220, overflow:'auto'}} /></label>
            {error && <p style={errSt}>{error}</p>}
            <button type="submit" disabled={cargando} style={btnPri}>{cargando?"Guardando...":"Previsualizar"}</button>
          </form>
        )}
        {vista==="previsualizacion" && preview && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ border:'1px solid var(--border-subtle)', borderRadius:12, padding:16, background:'var(--bg-surface)' }}>
              <h3 style={{ marginTop:0, fontFamily:'Outfit, sans-serif' }}>Empleado</h3><p style={{ fontSize:13, color:'var(--text-secondary)' }}>{preview.empleado.nombre} — {preview.empleado.email}</p>
              <h3 style={{ fontFamily:'Outfit, sans-serif' }}>Permiso</h3>
              <ul style={{ fontSize:13, paddingLeft:18, color:'var(--text-secondary)' }}><li>Día: {preview.permiso.fechaSolicitud}</li><li>Horas: {preview.permiso.horas}h</li><li>Tipo: {preview.permiso.tipo}</li><li>Descripción: {preview.permiso.descripcion}</li></ul>
            </div>
            {error && <p style={errSt}>{error}</p>}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}><button onClick={onEditar} style={btnSec}>Editar</button><button onClick={()=>setConfirmando(true)} style={btnPri}>Enviar</button></div>
          </div>
        )}
        {vista==="enviado" && <div style={{ background:'#16302A', border:'1px solid #6FCB9A', borderRadius:12, padding:16, color:'#A8E9C4' }}><p style={{margin:0}}>{exito ?? "✓ Permiso enviado correctamente."}</p><p style={{margin:'6px 0 0', fontSize:12, opacity:0.9}}>Tu solicitud quedó en estado ENVIADO y será revisada por un administrador.</p><button onClick={nuevo} style={{...btnSec, marginTop:12}}>Nueva solicitud</button></div>}
        {confirmando && (
          <div style={overlay}><div style={modal}><p style={{marginTop:0}}>¿Confirmas el envío?</p><div style={{display:'flex', gap:8, justifyContent:'flex-end'}}><button onClick={()=>setConfirmando(false)} style={btnSec}>Cancelar</button><button onClick={onConfirmar} disabled={cargando} style={btnPri}>{cargando?"Enviando...":"Confirmar"}</button></div></div></div>
        )}

        {/* Historial apartado */}
        <div style={{ marginTop:20, background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <h3 style={{ margin:0, fontFamily:'Outfit, sans-serif', fontSize:14 }}>Mis solicitudes</h3>
            <button onClick={cargarHistorial} style={{ ...btnSec, padding:'6px 10px', fontSize:12 }}>Recargar</button>
          </div>
          {cargandoHist ? <p style={{ color:'var(--text-secondary)', fontSize:13, marginTop:10 }}>Cargando...</p> : historial.length===0 ? (
            <p style={{ color:'var(--text-secondary)', fontSize:13, marginTop:10 }}>Aún no has solicitado permisos. Aparecerán aquí con su estado (aprobado/rechazado).</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12, maxHeight:360, overflow:'auto' }}>
              {historial.map(p=>{
                const est = colorEstado(p.estado);
                return (
                  <div key={p.id} style={{ border:'1px solid var(--border-subtle)', borderRadius:10, padding:10, background:'var(--bg-base)', display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, fontSize:12 }}>{p.fechaSolicitud} · {p.tipo} · {p.horas}h</span>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:9999, background: est.bg, color: est.color, border:'1px solid var(--border-subtle)' }}>{est.label}</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{p.descripcion}</div>
                  </div>
                );
              })}
            </div>
          )}
          <p style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:10, marginBottom:0 }}>Los permisos aprobados también se marcan en el <strong>Calendario</strong> el día correspondiente.</p>
        </div>
      </div>
    </div>
  );
}
const eti:React.CSSProperties={ display:'flex', flexDirection:'column', gap:6, fontSize:13, color:'var(--text-secondary)' };
const inp:React.CSSProperties={ padding:10, borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-base)', color:'var(--text-primary)', fontSize:16 };
const btnPri:React.CSSProperties={ padding:'12px 16px', borderRadius:8, background:'var(--cta-bg)', color:'var(--cta-text)', border:'none', fontWeight:700, cursor:'pointer', width:'100%' };
const btnSec:React.CSSProperties={ padding:'10px 16px', borderRadius:8, background:'var(--bg-surface)', color:'var(--text-primary)', border:'1px solid var(--border-subtle)', fontWeight:600, cursor:'pointer' };
const errSt:React.CSSProperties={ color:'var(--accent-danger)', fontSize:13, background:'var(--bg-surface)', padding:8, borderRadius:8, border:'1px solid var(--border-subtle)' };
const overlay:React.CSSProperties={ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, zIndex:70 };
const modal:React.CSSProperties={ background:'var(--bg-surface)', borderRadius:12, padding:20, width:'100%', maxWidth:360, border:'1px solid var(--border-subtle)' };
