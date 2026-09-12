import { useEffect, useRef } from "react";
import { DiaCalendarioDTO, RegistroDTO } from "../api/types";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useTheme } from "../context/ThemeContext";

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const DIAS_LABEL = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

export function WeekCalendar({
  weekDias,
  registrosMap,
  selectedFecha,
  onSelectDia,
  todayStr,
}: {
  weekDias: DiaCalendarioDTO[];
  registrosMap: Record<string, RegistroDTO>;
  selectedFecha: string | null;
  onSelectDia: (d: DiaCalendarioDTO) => void;
  todayStr: string;
}) {
  const bp = useBreakpoint();
  const { isDark } = useTheme();
  const isMobile = bp === 'mobile';
  const visibleDias = isMobile
    ? (selectedFecha ? weekDias.filter(d=>d.fecha===selectedFecha) : weekDias.filter(d=>d.fecha===todayStr)).slice(0,1).length
      ? (selectedFecha ? weekDias.filter(d=>d.fecha===selectedFecha) : weekDias.filter(d=>d.fecha===todayStr)).slice(0,1)
      : weekDias.slice(0,1)
    : weekDias;

  const now = new Date();
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=scrollRef.current; if(!el) return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(()=> el.scrollTo({ top: 8*44, behavior: reduced?'auto':'smooth' }));
  }, [weekDias]);

  return (
    <div style={{ display:'flex', flexDirection:'column', border:'1px solid var(--border-subtle)', borderRadius:12, overflow:'hidden', background:'var(--bg-surface)' }}>
      <div style={{ display:'grid', gridTemplateColumns:`56px repeat(${visibleDias.length}, 1fr)`, background:'var(--bg-surface)', borderBottom:'1px solid var(--border-subtle)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'var(--text-tertiary)', textTransform:'uppercase', borderRight:'1px solid var(--border-subtle)' }}>all-day</div>
        {visibleDias.map(d=>{
          const idx=weekDias.indexOf(d);
          const isToday=d.fecha===todayStr;
          const isFestivo=d.esFestivo;
          const isWeekend=d.esFinDeSemana;
          const headerBg=isFestivo?(isDark?'#4A1F1A':'#FED7D7'):isWeekend?(isDark?'#1E2A44':'#dbeafe'):isToday?(isDark?'#1F2535':'#EEF0FF'):'var(--bg-surface)';
          const label=DIAS_LABEL[idx]??'';
          return (
            <div key={d.fecha} onClick={()=>onSelectDia(d)} style={{ padding:'8px 4px', textAlign:'center', cursor:'pointer', background: headerBg, borderLeft:'1px solid var(--border-subtle)' }}>
              <div style={{ fontSize:13 }}>
                <span style={{ fontWeight:400, color:'var(--text-secondary)' }}>{label} </span>
                <span style={{ fontWeight:700, display:'inline-block', background: isToday?'var(--accent-primary)':isFestivo?'#C0392B':'transparent', color: isToday||isFestivo?'#fff':'var(--text-primary)', padding: isToday||isFestivo?'2px 8px':0, borderRadius:6, fontFamily:'Fraunces, serif' }}>{d.fecha.slice(8,10)}</span>
              </div>
              <div style={{ fontSize:10, color: isFestivo?(isDark?'#FCA5A5':'#9B1C1C'):'var(--text-tertiary)', marginTop:2, minHeight:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {d.nombreFestivo ?? (isWeekend && !isFestivo ? 'Sáb/Dom':'')} {d.horasTrabajadas?`· ${d.horasTrabajadas}h`:''}
              </div>
            </div>
          );
        })}
      </div>

      {isMobile && (
        <div style={{ display:'flex', gap:6, overflowX:'auto', padding:'8px', borderBottom:'1px solid var(--border-subtle)', WebkitOverflowScrolling:'touch', flexShrink:0 }}>
          {weekDias.map((d,i)=>{
            const active=d.fecha===(selectedFecha??todayStr);
            const isFestivo=d.esFestivo; const isWeekend=d.esFinDeSemana;
            const border=active?'var(--accent-primary)':isFestivo?'#C0392B':isWeekend?(isDark?'#3A4A6A':'#93c5fd'):'var(--border-subtle)';
            const bg=active?'var(--accent-primary)':isFestivo?(isDark?'#4A1F1A':'#FED7D7'):isWeekend?(isDark?'#1E2A44':'#dbeafe'):'var(--bg-surface)';
            return <button key={d.fecha} onClick={()=>onSelectDia(d)} style={{ flexShrink:0, minWidth:56, padding:'6px', borderRadius:10, border:`2px solid ${border}`, background:bg, color: active?'#fff': isFestivo?(isDark?'#FCA5A5':'#9B1C1C'):'var(--text-primary)', textAlign:'center', cursor:'pointer' }}><div style={{ fontSize:9, color: active?'rgba(255,255,255,0.9)':'var(--text-secondary)', textTransform:'uppercase' }}>{DIAS_LABEL[i]}</div><div style={{ fontSize:15, fontWeight:700, fontFamily:'Fraunces, serif' }}>{d.fecha.slice(8,10)}</div>{isFestivo && <div style={{ fontSize:8, fontWeight:700 }}>FER</div>}</button>;
          })}
        </div>
      )}

      <div ref={scrollRef} style={{ overflowY:'auto', overflowX:'hidden', maxHeight:'min(68vh,720px)', scrollbarWidth:'none', msOverflowStyle:'none' }} className="week-scroll">
        <style>{`.week-scroll::-webkit-scrollbar{display:none}`}</style>
        <div style={{ display:'grid', gridTemplateColumns:`56px repeat(${visibleDias.length}, 1fr)` }}>
          {HORAS.map(h=>(
            <div key={h} style={{ display:'contents' }}>
              <div style={{ fontSize:10, color: h===now.getHours() ? 'var(--accent-danger)' : 'var(--text-tertiary)', fontWeight: h===now.getHours()?700:400, padding:'6px 6px', borderTop:'1px solid var(--border-subtle)', textAlign:'right', height:44, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}>{String(h).padStart(2,'0')}:00</div>
              {visibleDias.map(d=>{
                const isToday=d.fecha===todayStr;
                const isFestivo=d.esFestivo; const isWeekend=d.esFinDeSemana;
                const reg=registrosMap[d.fecha];
                let inicioH=99, finH=99;
                if(reg?.horaInicio24 && reg?.horaFin24){
                  inicioH=Number(reg.horaInicio24.split(":")[0]); finH=Number(reg.horaFin24.split(":")[0]);
                  // if fin is next day 00-06, cap to 24
                  if(finH < inicioH) finH=24;
                } else if(d.horasTrabajadas>0){ inicioH=8; finH=Math.min(24, 8+Math.ceil(d.horasTrabajadas)); }
                const inWorked = d.horasTrabajadas>0 && h>=inicioH && h<finH;
                const isFirst = inWorked && h===inicioH;
                const isLast = inWorked && h===finH-1;
                // sutil wash like image: lavanda pálida + left accent only for worked cells
                const workedBg = isDark ? 'rgba(232,224,248,0.18)' : '#F3EFFF'; // sutil lavanda
                const washBg = inWorked ? workedBg : undefined;
                const festivoBg = !inWorked && isFestivo ? (isDark?'rgba(192,57,43,0.14)':'rgba(254,215,215,0.55)') : undefined;
                const weekendBg = !inWorked && !isFestivo && isWeekend ? (isDark?'rgba(58,74,106,0.12)':'rgba(219,234,254,0.45)') : undefined;
                const bg = washBg ?? festivoBg ?? weekendBg ?? (isToday ? (isDark?'#1F2535':'#F5F6FF') : 'transparent');
                const leftBorder = inWorked ? '3px solid #E8AFAF' : undefined;
                const radius = inWorked ? (isFirst && isLast ? '8px' : isFirst ? '8px 8px 0 0' : isLast ? '0 0 8px 8px' : '0') : undefined;
                return (
                  <div key={d.fecha+h} onClick={()=>onSelectDia(d)} style={{
                    borderTop:'1px solid var(--border-subtle)',
                    height:44, position:'relative', background: bg, cursor: inWorked?'pointer':'default',
                    borderLeft: inWorked ? leftBorder! : '1px solid var(--border-subtle)',
                    borderRadius: inWorked ? radius : undefined,
                    marginLeft: inWorked ? '-1px' : undefined,
                  }}>
                    {isFirst && (
                      <div style={{ position:'absolute', inset:'6px 8px 6px 8px', display:'flex', flexDirection:'column', justifyContent:'center', pointerEvents:'none' }}>
                        <div style={{ fontSize:12, fontWeight:600, color: isDark?'#E9DDF8':'#4A3A6A', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.horasTrabajadas}h{d.horasTrabajadas>=2?' · bloque':''}{d.nombreFestivo?` · ${d.nombreFestivo}`:''}</div>
                        <div style={{ fontSize:11, color: isDark?'#C9B8E8':'#8A7AA8' }}>{String(inicioH).padStart(2,'0')}:00 — {String(finH).padStart(2,'0')}:00</div>
                      </div>
                    )}
                    {isToday && h===now.getHours() && (
                      <div style={{ position:'absolute', left:0, right:0, top:`${(now.getMinutes()/60)*44}px`, height:2, background:'var(--accent-danger)', pointerEvents:'none', zIndex:3 }}><span style={{ position:'absolute', left:-4, top:-4, width:8, height:8, background:'var(--accent-danger)', borderRadius:9999 }} /></div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
