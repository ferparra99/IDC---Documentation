import { useEffect, useState, useMemo } from "react";
import { api, ApiError } from "../api/client";
import { DiaCalendarioDTO, RegistroDTO, ResumenSemanalDTO } from "../api/types";
import { MonthCalendar } from "../components/MonthCalendar";
import { WeekCalendar } from "../components/WeekCalendar";
import { SummaryPanel } from "../components/SummaryPanel";
import { DetailPanel, BottomSheet, Drawer } from "../components/DetailPanel";
import { DraggableHoursBar } from "../components/DraggableHoursBar";
import { primerYUltimoDiaSemana, hoyYYYYMMDD, hhmmAMinutos, minutosAIsoBogota } from "../utils/fecha";
import { useBreakpoint } from "../hooks/useBreakpoint";

const NOMBRES_MES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
type View = 'week' | 'month';
function addDays(s:string, d:number):string{ const [y,m,da]=s.split("-").map(Number); const dt=new Date(Date.UTC(y,m-1,da+12,0,0,0)); dt.setUTCDate(dt.getUTCDate()+d); return `${dt.getUTCFullYear().toString().padStart(4,"0")}-${String(dt.getUTCMonth()+1).padStart(2,"0")}-${String(dt.getUTCDate()).padStart(2,"0")}`; }

export function CalendarPage() {
  const hoy = new Date();
  const bp = useBreakpoint();
  const [view, setView] = useState<View>(()=> (localStorage.getItem('calendarView') as View) || 'week');
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth()+1);
  const [dias, setDias] = useState<DiaCalendarioDTO[]>([]);
  const [resumenSemanal, setResumenSemanal] = useState<ResumenSemanalDTO|null>(null);
  const [resumenMensual, setResumenMensual] = useState<ResumenSemanalDTO|null>(null);
  const [diaEditando, setDiaEditando] = useState<DiaCalendarioDTO|null>(null);
  const [registroDetalle, setRegistroDetalle] = useState<RegistroDTO|null>(null);
  const [error, setError] = useState<string|null>(null);
  const hoyStr = hoyYYYYMMDD();
  const [weekAnchor, setWeekAnchor] = useState(hoyStr);
  const [weekRegistros, setWeekRegistros] = useState<Record<string,RegistroDTO>>({});

  const persistView = (v:View)=>{ setView(v); localStorage.setItem('calendarView', v); };

  const cargar = async ()=>{
    setError(null);
    try{
      const data = await api.get<DiaCalendarioDTO[]>(`/calendar?anio=${anio}&mes=${mes}`);
      setDias(data);
      const { lunes, domingo } = primerYUltimoDiaSemana(hoyStr);
      const rSem = await api.get<ResumenSemanalDTO>(`/attendance/summary?desde=${lunes}&hasta=${domingo}`);
      setResumenSemanal(rSem);
      // mensual: sumar dias existentes + fetch attendance for month range for accuracy
      const first=`${anio.toString().padStart(4,"0")}-${String(mes).padStart(2,"0")}-01`;
      const lastDay=new Date(Date.UTC(anio,mes,0)).getUTCDate();
      const last=`${anio.toString().padStart(4,"0")}-${String(mes).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
      try{
        const rMen = await api.get<ResumenSemanalDTO>(`/attendance/summary?desde=${first}&hasta=${last}`);
        setResumenMensual(rMen);
      }catch{
        // fallback from dias
        const total = data.reduce((a,d)=>a+d.horasTrabajadas,0);
        setResumenMensual({ horasTrabajadas: total, horasMinimasSemanales: 42*4, horasExtra: Math.max(0,total-42*4), horasFaltantes: Math.max(0,42*4-total), } as ResumenSemanalDTO);
      }
    }catch(err){ setError(err instanceof ApiError ? err.message : "No se pudo cargar el calendario."); }
  };
  useEffect(()=>{ cargar(); }, [anio, mes]);

  // fetch registros for week view (for 08-17 wash exact)
  useEffect(()=>{
    if(view!=='week') return;
    const { lunes, domingo } = primerYUltimoDiaSemana(weekAnchor);
    api.get<RegistroDTO[]>(`/attendance?desde=${lunes}&hasta=${domingo}`).then(rs=>{
      const map:Record<string,RegistroDTO>={};
      rs.forEach(r=> map[r.fecha]=r);
      setWeekRegistros(map);
    }).catch(()=> setWeekRegistros({}));
  }, [view, weekAnchor, dias]);

  const cambiarMes = (d:number)=>{ let nm=mes+d, na=anio; if(nm>12){nm=1;na++;} if(nm<1){nm=12;na--;} setMes(nm); setAnio(na); };
  const cambiarSemana = (d:number)=> setWeekAnchor(a=> addDays(a, d*7));

  const weekDias: DiaCalendarioDTO[] = useMemo(()=>{
    const { lunes } = primerYUltimoDiaSemana(weekAnchor);
    const base = new Date(lunes+"T12:00:00Z");
    return Array.from({length:7},(_,i)=>{
      const dt=new Date(base); dt.setUTCDate(base.getUTCDate()+i);
      const fecha=`${dt.getUTCFullYear().toString().padStart(4,"0")}-${String(dt.getUTCMonth()+1).padStart(2,"0")}-${String(dt.getUTCDate()).padStart(2,"0")}`;
      const found=dias.find(x=>x.fecha===fecha);
      if(found) return found;
      const wd=dt.getUTCDay(); const isWeekend = wd===0 || wd===6;
      return { fecha, horasTrabajadas:0, esFestivo:false, esFinDeSemana:isWeekend, nombreFestivo:null, registroId:null, estado:null } as DiaCalendarioDTO;
    });
  }, [weekAnchor, dias]);

  const onSelectDia = async (d:DiaCalendarioDTO)=>{
    setDiaEditando(d);
    const reg = weekRegistros[d.fecha];
    if(reg){ setRegistroDetalle(reg); return; }
    if(d.registroId){
      try{ const regs = await api.get<RegistroDTO[]>(`/attendance?desde=${d.fecha}&hasta=${d.fecha}`); setRegistroDetalle(regs[0]??null); }catch{ setRegistroDetalle(null); }
    } else setRegistroDetalle(null);
  };

  const tituloSemana = useMemo(()=>{
    const { lunes, domingo } = primerYUltimoDiaSemana(weekAnchor);
    const [ly,lm,ld]=lunes.split("-").map(Number);
    const [dy,dm,dd]=domingo.split("-").map(Number);
    if(lm===dm) return `${ld} — ${dd} ${NOMBRES_MES[lm-1]} ${ly}`;
    return `${ld} ${NOMBRES_MES[lm-1]} — ${dd} ${NOMBRES_MES[dm-1]} ${ly}`;
  }, [weekAnchor]);

  const resumenActivo = view==='month' ? resumenMensual : resumenSemanal;

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:8 }}>
        {view==='month' ? (
          <><button onClick={()=>cambiarMes(-1)} style={btnSec}>←</button><h2 style={{ fontSize:18, margin:0, fontFamily:'Fraunces, serif' }}>{NOMBRES_MES[mes-1]} {anio}</h2><button onClick={()=>cambiarMes(1)} style={btnSec}>→</button></>
        ) : (
          <><button onClick={()=>cambiarSemana(-1)} style={btnSec}>←</button><h2 style={{ fontSize:16, margin:0, fontFamily:'Fraunces, serif' }}>{tituloSemana}</h2><button onClick={()=>cambiarSemana(1)} style={btnSec}>→</button><button onClick={()=>setWeekAnchor(hoyStr)} style={{...btnSec, fontSize:12}}>Hoy</button></>
        )}
        <div style={{ flex:1 }} />
        <div style={{ display:'flex', background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:9999, padding:3, gap:4 }}>
          {(['week','month'] as View[]).map(v=>(
            <button key={v} onClick={()=>persistView(v)} style={{ padding:'6px 14px', borderRadius:9999, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: view===v ? 'var(--accent-primary)' : 'transparent', color: view===v ? '#fff' : 'var(--text-secondary)', }}>{v==='week'?'Semanal':'Mensual'}</button>
          ))}
        </div>
      </div>

      <SummaryPanel resumen={resumenActivo} view={view} />
      {error && <p style={{ color:'var(--accent-danger)', fontSize:13 }}>{error}</p>}

      {/* layout: calendar left, detail right on desktop */}
      <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
        <div style={{ flex:1, minWidth:0 }}>
          {view === 'month' ? (
            <MonthCalendar anio={anio} mes={mes} dias={dias} onSeleccionarDia={onSelectDia} />
          ) : (
            <WeekCalendar weekDias={weekDias} registrosMap={weekRegistros} selectedFecha={diaEditando?.fecha ?? null} onSelectDia={onSelectDia} todayStr={hoyStr} />
          )}
        </div>

        {/* desktop right panel */}
        {bp==='desktop' && diaEditando && (
          <div style={{ width:360, flexShrink:0, position:'sticky', top:16, display:'flex', flexDirection:'column', gap:12 }}>
            <EditContent dia={diaEditando} registro={registroDetalle} onClose={()=>{setDiaEditando(null); setRegistroDetalle(null);}} onGuardado={()=>{setDiaEditando(null); setRegistroDetalle(null); cargar();}} />
            {registroDetalle && <DetailPanel resumen={resumenActivo} registro={registroDetalle} onClose={()=>{setDiaEditando(null); setRegistroDetalle(null);}} />}
          </div>
        )}
      </div>

      {bp === 'mobile' && (
        <BottomSheet open={!!diaEditando} onClose={()=>{setDiaEditando(null); setRegistroDetalle(null);}}>
          {diaEditando && <EditContent dia={diaEditando} registro={registroDetalle} onClose={()=>{setDiaEditando(null); setRegistroDetalle(null);}} onGuardado={()=>{setDiaEditando(null); setRegistroDetalle(null); cargar();}} />}
          {diaEditando && registroDetalle && <div style={{marginTop:12}}><DetailPanel resumen={resumenActivo} registro={registroDetalle} /></div>}
        </BottomSheet>
      )}
      {bp === 'tablet' && (
        <Drawer open={!!diaEditando} onClose={()=>{setDiaEditando(null); setRegistroDetalle(null);}}>
          {diaEditando && <EditContent dia={diaEditando} registro={registroDetalle} onClose={()=>{setDiaEditando(null); setRegistroDetalle(null);}} onGuardado={()=>{setDiaEditando(null); setRegistroDetalle(null); cargar();}} />}
          {diaEditando && registroDetalle && <div style={{marginTop:12}}><DetailPanel resumen={resumenActivo} registro={registroDetalle} /></div>}
        </Drawer>
      )}
      {/* desktop mobile already handled; desktop inline handled above */}
    </div>
  );
}

function EditContent({ dia, registro: regProp, onClose, onGuardado }: { dia: DiaCalendarioDTO; registro: RegistroDTO|null; onClose:()=>void; onGuardado:()=>void }){
  const [registro, setRegistro] = useState<RegistroDTO|null>(regProp);
  const [inicioMin, setInicioMin]=useState(8*60);
  const [finMin,setFinMin]=useState(17*60);
  const [motivo,setMotivo]=useState("");
  const [error,setError]=useState<string|null>(null);
  const [guardando,setGuardando]=useState(false);
  const [loading,setLoading]=useState(!regProp);

  useEffect(()=>{
    if(regProp){ setRegistro(regProp); if(regProp.horaInicio24) setInicioMin(hhmmAMinutos(regProp.horaInicio24)); if(regProp.horaFin24) setFinMin(hhmmAMinutos(regProp.horaFin24)); setLoading(false); return; }
    setLoading(true);
    api.get<RegistroDTO[]>(`/attendance?desde=${dia.fecha}&hasta=${dia.fecha}`).then(rs=>{
      const r=rs[0]; if(r){ setRegistro(r); if(r.horaInicio24) setInicioMin(hhmmAMinutos(r.horaInicio24)); if(r.horaFin24) setFinMin(hhmmAMinutos(r.horaFin24)); }
    }).catch(()=>setError("No se pudo cargar el detalle.")).finally(()=>setLoading(false));
  }, [dia.fecha, regProp]);

  const guardar = async ()=>{
    if(!registro) return;
    if(!motivo.trim()){ setError("El motivo es obligatorio."); return; }
    setGuardando(true); setError(null);
    try{ await api.put(`/attendance/${registro.id}`, { horaInicio: minutosAIsoBogota(dia.fecha, inicioMin), horaFin: minutosAIsoBogota(dia.fecha, finMin), motivo }); onGuardado(); }
    catch(err){ setError(err instanceof ApiError ? err.message : "No se pudo guardar."); }
    finally{ setGuardando(false); }
  };

  if(loading) return <div style={{ padding:16, background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:12, fontSize:13, color:'var(--text-secondary)' }}>Cargando...</div>;
  if(!registro) return <div style={{ padding:16, background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:12 }}><div style={{fontWeight:600, color:'var(--text-primary)'}}>Sin registro ese día</div><div style={{fontSize:12, color:'var(--text-secondary)', marginTop:4}}>Haz clic en un día con horas para editar.</div><button onClick={onClose} style={{...btnSec, marginTop:8}}>Cerrar</button></div>;

  return (
    <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:16 }}>
      <h3 style={{ marginTop:0, fontSize:15, fontFamily:'Fraunces, serif', color:'var(--text-primary)' }}>Editar jornada — {dia.fecha} {dia.nombreFestivo && <span style={{color:'var(--accent-danger)', fontSize:12}}>({dia.nombreFestivo})</span>}</h3>
      <DraggableHoursBar inicioMin={inicioMin} finMin={finMin} onChange={(i,f)=>{setInicioMin(i); setFinMin(f);}} />
      <p style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:4 }}>No cruza medianoche en esta vista. Para otros casos usa el backoffice.</p>
      <textarea placeholder="Motivo (obligatorio, auditado)" value={motivo} onChange={e=>setMotivo(e.target.value)} rows={2} style={{ width:'100%', marginTop:10, padding:8, borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-base)', color:'var(--text-primary)', fontSize:16 }} />
      {error && <p style={{ color:'var(--accent-danger)', fontSize:13 }}>{error}</p>}
      <div style={{ display:'flex', gap:8, marginTop:12, justifyContent:'flex-end', flexWrap:'wrap' }}>
        <button onClick={onClose} style={btnSec}>Cancelar</button>
        <button onClick={guardar} disabled={guardando} style={{...btnPri, opacity: guardando?0.6:1, width: 'auto' }}>{guardando?"Guardando...":"Guardar corrección"}</button>
      </div>
    </div>
  );
}

const btnPri: React.CSSProperties = { padding:'10px 16px', borderRadius:8, background:'var(--cta-bg)', color:'var(--cta-text)', border:'none', fontWeight:600, cursor:'pointer', width:'100%' };
const btnSec: React.CSSProperties = { padding:'8px 14px', borderRadius:8, background:'var(--bg-surface)', color:'var(--text-primary)', border:'1px solid var(--border-subtle)', fontWeight:600, cursor:'pointer' };
