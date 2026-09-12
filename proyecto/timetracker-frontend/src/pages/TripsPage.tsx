import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { ViajeDTO } from "../api/types";
import { hoyYYYYMMDD } from "../utils/fecha";
import { TopToolbar } from "../components/TopToolbar";

interface ConfigItem { clave:string; valor:unknown }
const FORM_VACIO = { puntoPartida:"", puntoFinal:"", descripcion:"", valor:"" };

export function TripsPage(){
  const [fecha,setFecha]=useState(hoyYYYYMMDD());
  const [viajes,setViajes]=useState<ViajeDTO[]>([]);
  const [valorDef,setValorDef]=useState(5000);
  const [form,setForm]=useState(FORM_VACIO);
  const [editId,setEditId]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [cargando,setCargando]=useState(false);

  useEffect(()=>{ api.get<ConfigItem[]>("/config").then(items=>{ const it=items.find(i=>i.clave==="valorViajePorDefecto"); if(it) setValorDef(Number(it.valor)); }); },[]);
  const cargar=async()=>{ setError(null); try{ const d=await api.get<ViajeDTO[]>(`/trips?desde=${fecha}&hasta=${fecha}`); setViajes(d);}catch(err){ setError(err instanceof ApiError?err.message:"No se pudieron cargar viajes."); } };
  useEffect(()=>{ cargar(); },[fecha]);
  const iniciarNuevo=()=>{ setEditId(null); setForm({...FORM_VACIO, valor:String(valorDef)}); };
  useEffect(()=>{ iniciarNuevo(); },[valorDef]);

  const onSubmit=async(e:React.FormEvent)=>{
    e.preventDefault(); setError(null); setCargando(true);
    try{ const dto={ fecha, puntoPartida:form.puntoPartida, puntoFinal:form.puntoFinal, descripcion:form.descripcion, valor: form.valor===""?undefined:Number(form.valor)}; if(editId) await api.put(`/trips/${editId}`, dto); else await api.post("/trips", dto); iniciarNuevo(); await cargar();}
    catch(err){ setError(err instanceof ApiError?err.message:"No se pudo guardar."); } finally{ setCargando(false); }
  };
  const onEditar=(v:ViajeDTO)=>{ setEditId(v.id); setForm({ puntoPartida:v.puntoPartida, puntoFinal:v.puntoFinal, descripcion:v.descripcion, valor:String(v.valor)}); };
  const onEliminar=async(id:string)=>{ setCargando(true); try{ await api.delete(`/trips/${id}`); await cargar(); }catch(err){ setError(err instanceof ApiError?err.message:"No se pudo eliminar."); } finally{ setCargando(false); } };

  return (
    <div>
      <TopToolbar title="Viajes" subtitle="Desplazamientos laborales del día" />
      <label style={{...eti, maxWidth:220, marginBottom:12}}>Día<input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inp} /></label>

      <div style={{ display:'flex', flexDirection:'column', gap:8, margin:'16px 0' }}>
        {viajes.length===0 && <p style={{ fontSize:13, color:'var(--text-secondary)', background:'var(--bg-surface)', padding:12, borderRadius:10, border:'1px solid var(--border-subtle)' }}>Sin viajes este día.</p>}
        {viajes.map(v=>(
          <div key={v.id} style={{ border:'1px solid var(--border-subtle)', borderLeft:'3px solid var(--accent-primary)', borderRadius:10, padding:12, background:'var(--bg-surface)', display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
            <div style={{ fontSize:13 }}><strong>{v.puntoPartida} → {v.puntoFinal}</strong><div style={{color:'var(--text-secondary)'}}>{v.descripcion}</div><div style={{color:'var(--accent-primary)', fontWeight:700, fontFamily:'JetBrains Mono, monospace'}}>${v.valor.toLocaleString("es-CO")}</div></div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}><button onClick={()=>onEditar(v)} style={btnSec}>Editar</button><button onClick={()=>onEliminar(v.id)} style={btnDanger}>Eliminar</button></div>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily:'Fraunces, serif' }}>{editId?"Editar viaje":"Nuevo viaje"}</h3>
      <form onSubmit={onSubmit} style={{ display:'flex', flexDirection:'column', gap:12, background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:16, maxWidth:560 }}>
        <label style={eti}>Punto de partida<input required value={form.puntoPartida} onChange={e=>setForm({...form, puntoPartida:e.target.value})} style={inp} /></label>
        <label style={eti}>Punto final<input required value={form.puntoFinal} onChange={e=>setForm({...form, puntoFinal:e.target.value})} style={inp} /></label>
        <label style={eti}>Descripción<textarea required rows={2} value={form.descripcion} onChange={e=>setForm({...form, descripcion:e.target.value})} style={inp} /></label>
        <label style={eti}>Valor (por defecto ${valorDef.toLocaleString("es-CO")})<input type="number" min={0} step={100} value={form.valor} onChange={e=>setForm({...form, valor:e.target.value})} style={inp} /></label>
        {error && <p style={errSt}>{error}</p>}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button type="submit" disabled={cargando} style={{...btnPri, flex:'1 1 200px'}}>{cargando?"Guardando...":editId?"Guardar cambios":"Agregar viaje"}</button>
          {editId && <button type="button" onClick={iniciarNuevo} style={btnSec}>Cancelar</button>}
        </div>
      </form>
    </div>
  );
}
const eti:React.CSSProperties={ display:'flex', flexDirection:'column', gap:6, fontSize:13, color:'var(--text-secondary)' };
const inp:React.CSSProperties={ padding:10, borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-base)', color:'var(--text-primary)', fontSize:16 };
const btnPri:React.CSSProperties={ padding:'12px 16px', borderRadius:8, background:'var(--cta-bg)', color:'var(--cta-text)', border:'none', fontWeight:700, cursor:'pointer' };
const btnSec:React.CSSProperties={ padding:'10px 14px', borderRadius:8, background:'var(--bg-surface)', color:'var(--text-primary)', border:'1px solid var(--border-subtle)', fontWeight:600, cursor:'pointer' };
const btnDanger:React.CSSProperties={ padding:'8px 12px', borderRadius:8, background:'var(--accent-danger)', color:'#fff', border:'none', fontWeight:600, cursor:'pointer', fontSize:12 };
const errSt:React.CSSProperties={ color:'var(--accent-danger)', fontSize:13, background:'var(--bg-surface)', padding:8, borderRadius:8, border:'1px solid var(--border-subtle)' };
