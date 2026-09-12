import { ResumenSemanalDTO, RegistroDTO } from "../api/types";
import { useTheme } from "../context/ThemeContext";
import { colorCategoria } from "../styles/categorias";

export function DetailPanel({ resumen, registro, onClose }: { resumen?: ResumenSemanalDTO | null; registro?: RegistroDTO | null; onClose?: () => void }) {
  const { isDark } = useTheme();
  if (!resumen && !registro) return null;
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {onClose && <button onClick={onClose} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18 }}>×</button>}
      {resumen && (
        <>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 14 }}>Resumen semanal</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { l: 'Trabajadas', v: resumen.horasTrabajadas, c: 'ordinarias' as const },
              { l: 'Mínimo', v: resumen.horasMinimasSemanales, c: 'permiso' as const },
              { l: 'Extra', v: resumen.horasExtra, c: 'extraDiurna' as const },
              { l: 'Faltantes', v: resumen.horasFaltantes, c: resumen.horasFaltantes>0?'dominical' as const:'ordinarias' as const },
            ].map(it => {
              const col = colorCategoria(it.c, isDark);
              return (
                <div key={it.l} style={{ background: col.bg, borderLeft:`3px solid ${col.border}`, borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{it.l}</div>
                  <div style={{ fontSize:18, fontWeight:700, color: col.text }}>{it.v}h</div>
                  <div style={{ height:4, background:'var(--border-subtle)', borderRadius:9999, marginTop:6, overflow:'hidden' }}>
                    <div style={{ width:`${Math.min(100,(it.v/42)*100)}%`, height:'100%', background: col.border }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {registro && (
        <>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight:700, fontSize:14 }}>Jornada {registro.fecha}</div>
          <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{registro.horaInicio24 ?? '-'} → {registro.horaFin24 ?? '-'} · <span className="mono">{registro.estado}</span></div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {([
              ['Ordinarias', registro.horasOrdinarias, 'ordinarias'],
              ['Extra diurna', registro.horasExtraDiurnas, 'extraDiurna'],
              ['Extra nocturna', registro.horasExtraNocturnas, 'extraNocturna'],
              ['Recargo nocturno', registro.horasRecargoNocturno, 'recargo'],
              ['Dominical/festivo', registro.horasDominicalFestivo, 'dominical'],
            ] as const).map(([label,val,cat]) => {
              const col = colorCategoria(cat as any, isDark);
              const pct = Math.min(100, (val/8)*100);
              return (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                  <span style={{ flex:1, color:'var(--text-secondary)' }}>{label}</span>
                  <span className="mono" style={{ color: col.text, fontWeight:600 }}>{val}h</span>
                  <span style={{ width:80, height:6, background:'var(--border-subtle)', borderRadius:9999, overflow:'hidden', display:'inline-block' }}>
                    <span style={{ display:'block', width:`${pct}%`, height:'100%', background: col.border }} />
                  </span>
                </div>
              );
            })}
          </div>
          {registro.descripcionProyectos && <div style={{ fontSize:12, padding:8, background:'var(--bg-base)', borderRadius:8, border:'1px solid var(--border-subtle)' }}>{registro.descripcionProyectos}</div>}
        </>
      )}
    </div>
  );
}

// BottomSheet wrapper for mobile
export function BottomSheet({ open, onClose, children }: { open: boolean; onClose: ()=>void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
      <div onClick={onClose} style={{ flex:1, background:'rgba(0,0,0,0.45)' }} />
      <div style={{ background:'var(--bg-surface)', borderTop:'1px solid var(--border-subtle)', borderTopLeftRadius:16, borderTopRightRadius:16, padding:'12px 16px calc(16px + env(safe-area-inset-bottom))', maxHeight:'85vh', overflowY:'auto', boxShadow:'var(--shadow-soft)' }}>
        <div style={{ width:36, height:4, background:'var(--border-subtle)', borderRadius:9999, margin:'0 auto 12px' }} />
        {children}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, children }: { open: boolean; onClose: ()=>void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', justifyContent:'flex-end' }}>
      <div onClick={onClose} style={{ flex:1, background:'rgba(0,0,0,0.35)' }} />
      <div style={{ width:360, maxWidth:'85vw', background:'var(--bg-surface)', borderLeft:'1px solid var(--border-subtle)', padding:16, overflowY:'auto' }}>
        {children}
      </div>
    </div>
  );
}
