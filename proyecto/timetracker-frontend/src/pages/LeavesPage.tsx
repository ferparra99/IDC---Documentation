import { useState, FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { PermisoDTO, PreviewPermisoDTO, TipoPermiso } from "../api/types";
import { TopToolbar } from "../components/TopToolbar";

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

  const cargarPreview = async (id:string)=>{ const data=await api.get<PreviewPermisoDTO>(`/leaves/${id}/preview`); setPreview(data); setVista("previsualizacion"); };
  const onSubmit = async (e:FormEvent)=>{
    e.preventDefault(); setError(null); setCargando(true);
    try{ const dto={...form, horas:Number(form.horas)}; const p:PermisoDTO = permisoId ? await api.put(`/leaves/${permisoId}`, dto) : await api.post("/leaves", dto); setPermisoId(p.id); await cargarPreview(p.id); }
    catch(err){ setError(err instanceof ApiError?err.message:"No se pudo guardar."); } finally{ setCargando(false); }
  };
  const onEditar = ()=>{ if(!preview) return; setForm({ fechaSolicitud: preview.permiso.fechaSolicitud, horas:String(preview.permiso.horas), tipo: preview.permiso.tipo, descripcion: preview.permiso.descripcion }); setVista("formulario"); };
  const onConfirmar = async ()=>{
    if(!permisoId) return; setCargando(true); setError(null);
    try{ await api.post(`/leaves/${permisoId}/submit`); setConfirmando(false); setVista("enviado"); }
    catch(err){ setError(err instanceof ApiError?err.message:"No se pudo enviar."); } finally{ setCargando(false); }
  };
  const nuevo = ()=>{ setForm(FORM_VACIO); setPermisoId(null); setPreview(null); setVista("formulario"); };

  return (
    <div>
      <TopToolbar title="Permisos" subtitle="Solicitud → previsualización → envío" />
      <div style={{ maxWidth:560 }}>
        {vista==="formulario" && (
          <form onSubmit={onSubmit} style={{ display:"flex", flexDirection:"column", gap:12, background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:16 }}>
            <label style={eti}>Día de solicitud<input type="date" required value={form.fechaSolicitud} onChange={e=>setForm({...form, fechaSolicitud:e.target.value})} style={inp} /></label>
            <label style={eti}>Horas<input type="number" min={0.5} step={0.5} required value={form.horas} onChange={e=>setForm({...form, horas:e.target.value})} style={inp} /></label>
            <label style={eti}>Tipo<select value={form.tipo} onChange={e=>setForm({...form, tipo:e.target.value as TipoPermiso})} style={inp}><option value="PARCIAL">Parcial</option><option value="COMPLETO">Completo</option></select></label>
            <label style={eti}>Descripción<textarea required rows={3} value={form.descripcion} onChange={e=>setForm({...form, descripcion:e.target.value})} style={inp} /></label>
            {error && <p style={errSt}>{error}</p>}
            <button type="submit" disabled={cargando} style={btnPri}>{cargando?"Guardando...":"Previsualizar"}</button>
          </form>
        )}
        {vista==="previsualizacion" && preview && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ border:'1px solid var(--border-subtle)', borderRadius:12, padding:16, background:'var(--bg-surface)' }}>
              <h3 style={{ marginTop:0, fontFamily:'Fraunces, serif' }}>Empleado</h3><p style={{ fontSize:13, color:'var(--text-secondary)' }}>{preview.empleado.nombre} — {preview.empleado.email}</p>
              <h3 style={{ fontFamily:'Fraunces, serif' }}>Permiso</h3>
              <ul style={{ fontSize:13, paddingLeft:18, color:'var(--text-secondary)' }}><li>Día: {preview.permiso.fechaSolicitud}</li><li>Horas: {preview.permiso.horas}h</li><li>Tipo: {preview.permiso.tipo}</li><li>Descripción: {preview.permiso.descripcion}</li></ul>
            </div>
            {error && <p style={errSt}>{error}</p>}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}><button onClick={onEditar} style={btnSec}>Editar</button><button onClick={()=>setConfirmando(true)} style={btnPri}>Enviar</button></div>
          </div>
        )}
        {vista==="enviado" && <div style={{ background:'#16302A', border:'1px solid #6FCB9A', borderRadius:12, padding:16, color:'#A8E9C4' }}><p style={{margin:0}}>✓ Permiso enviado correctamente.</p><button onClick={nuevo} style={{...btnSec, marginTop:12}}>Nueva solicitud</button></div>}
        {confirmando && (
          <div style={overlay}><div style={modal}><p style={{marginTop:0}}>¿Confirmas el envío?</p><div style={{display:'flex', gap:8, justifyContent:'flex-end'}}><button onClick={()=>setConfirmando(false)} style={btnSec}>Cancelar</button><button onClick={onConfirmar} disabled={cargando} style={btnPri}>{cargando?"Enviando...":"Confirmar"}</button></div></div></div>
        )}
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
