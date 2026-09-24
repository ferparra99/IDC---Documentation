import { ResumenSemanalDTO } from "../api/types";
import { useTheme } from "../context/ThemeContext";
import { colorCategoria } from "../styles/categorias";

export function SummaryPanel({ resumen, view }: { resumen: ResumenSemanalDTO | null; view?: 'week' | 'month' }) {
  if (!resumen) return null;
  const { isDark } = useTheme();
  const total = Math.max(0.1, resumen.horasTrabajadas + resumen.horasFaltantes);
  const segments = [
    { label: view === 'month' ? 'Trabajadas (mes)' : 'Trabajadas', valor: resumen.horasTrabajadas, cat: 'ordinarias' as const },
    { label: 'Extra', valor: resumen.horasExtra, cat: 'extraDiurna' as const },
    { label: 'Faltantes', valor: resumen.horasFaltantes, cat: resumen.horasFaltantes>0 ? 'dominical' as const : 'ordinarias' as const },
  ].filter(s=> s.valor>0 || s.label.includes('Trabajadas'));

  return (
    <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:10, padding:'8px 12px', margin:'8px 0', display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', fontSize:11 }}>
        {segments.map(s=>{
          const col=colorCategoria(s.cat,isDark);
          return <span key={s.label} style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--text-secondary)' }}><span style={{ width:10, height:10, borderRadius:3, background: col.border, display:'inline-block' }} />{s.label} <strong style={{ color: col.text, fontFamily:'Outfit, monospace' }}>{s.valor}h</strong></span>;
        })}
        <span style={{ marginLeft:'auto', fontSize:10, color:'var(--text-tertiary)', fontFamily:'Outfit, monospace' }}>{resumen.horasTrabajadas}h / {total.toFixed(1)}h</span>
      </div>
      {/* barra única autoincrementable */}
      <div style={{ display:'flex', height: 18, borderRadius:9999, overflow:'hidden', background:'var(--border-subtle)', border:'1px solid var(--border-subtle)' }} role="progressbar" aria-valuenow={resumen.horasTrabajadas}>
        {segments.map(s=>{
          const col=colorCategoria(s.cat,isDark);
          const w = (s.valor/total)*100;
          if(w<=0) return null;
          return (
            <div key={s.label} title={`${s.label}: ${s.valor}h`} style={{
              width:`${w}%`, background: col.border, display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontSize:10, fontWeight:700, minWidth: s.valor>2 ? 40 : 0,
              borderRight:'1px solid var(--bg-surface)',
              transition:'width 400ms ease',
            }}>
              {w>12 ? `${s.valor}h` : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
