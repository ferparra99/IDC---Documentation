import { useRef, useState, useCallback } from "react";

const MINUTOS_DIA = 24 * 60;
function minutosAHora(min: number): string {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = Math.floor(min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function DraggableHoursBar({ inicioMin, finMin, onChange }: { inicioMin: number; finMin: number; onChange: (i:number,f:number)=>void }) {
  const barraRef = useRef<HTMLDivElement>(null);
  const [arrastrando, setArrastrando] = useState<"inicio"|"fin"|null>(null);

  const minutosDesdeEvento = useCallback((clientX:number)=>{
    const r = barraRef.current?.getBoundingClientRect(); if(!r) return 0;
    const p = Math.min(1, Math.max(0, (clientX - r.left)/r.width));
    return Math.round((p*MINUTOS_DIA)/15)*15;
  },[]);

  const onPointerDown = (c:"inicio"|"fin") => (e:React.PointerEvent)=>{
    (e.target as Element).setPointerCapture(e.pointerId);
    setArrastrando(c);
  };
  const onPointerMove = (e:React.PointerEvent)=>{
    if(!arrastrando) return;
    const m = minutosDesdeEvento(e.clientX);
    if(arrastrando==="inicio") onChange(Math.min(m, finMin-15), finMin);
    else onChange(inicioMin, Math.max(m, inicioMin+15));
  };
  const onPointerUp = ()=> setArrastrando(null);
  const pctInicio = (inicioMin/MINUTOS_DIA)*100;
  const pctFin = (finMin/MINUTOS_DIA)*100;

  return (
    <div style={{ userSelect:'none', touchAction:'none' }}>
      <div ref={barraRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
        style={{ position:'relative', height:36, borderRadius:8, background:'linear-gradient(to right, #334155 0%, #334155 25%, var(--bg-surface) 25%, var(--bg-surface) 79.17%, #334155 79.17%, #334155 100%)', border:'1px solid var(--border-subtle)', touchAction:'none' }}>
        <div style={{ position:'absolute', top:0, bottom:0, left:`${pctInicio}%`, width:`${pctFin-pctInicio}%`, background:'rgba(107,122,255,0.35)', borderLeft:'2px solid var(--accent-primary)', borderRight:'2px solid var(--accent-primary)' }} />
        <div onPointerDown={onPointerDown("inicio")} title={`Inicio: ${minutosAHora(inicioMin)}`}
          style={{ position:'absolute', top:-4, left:`calc(${pctInicio}% - 10px)`, width:20, height:44, borderRadius:4, background:'var(--accent-primary)', cursor:'ew-resize', display:'grid', placeItems:'center', color:'#fff', fontSize:10 }}>◀</div>
        <div onPointerDown={onPointerDown("fin")} title={`Fin: ${minutosAHora(finMin)}`}
          style={{ position:'absolute', top:-4, left:`calc(${pctFin}% - 10px)`, width:20, height:44, borderRadius:4, background:'var(--accent-primary)', cursor:'ew-resize', display:'grid', placeItems:'center', color:'#fff', fontSize:10 }}>▶</div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginTop:6, color:'var(--text-secondary)' }}>
        <span>Inicio: <strong className="mono" style={{color:'var(--text-primary)'}}>{minutosAHora(inicioMin)}</strong></span>
        <span>Fin: <strong className="mono" style={{color:'var(--text-primary)'}}>{minutosAHora(finMin)}</strong></span>
      </div>
      <p style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:2 }}>Franja oscura = nocturna (19:00–06:00). Arrastra con dedo o mouse.</p>
    </div>
  );
}
