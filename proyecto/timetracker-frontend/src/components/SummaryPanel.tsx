import { ResumenSemanalDTO } from "../api/types";
import { useTheme } from "../context/ThemeContext";
import { colorCategoria } from "../styles/categorias";

export function SummaryPanel({ resumen, view }: { resumen: ResumenSemanalDTO | null; view?: 'week' | 'month' }) {
  if (!resumen) return null;
  const { isDark } = useTheme();
  const items = [
    { etiqueta: view === 'month' ? "Trabajadas (mes)" : "Trabajadas (semana)", valor: resumen.horasTrabajadas, cat: 'ordinarias' as const },
    { etiqueta: "Extra", valor: resumen.horasExtra, cat: 'extraDiurna' as const },
    { etiqueta: "Faltantes", valor: resumen.horasFaltantes, cat: resumen.horasFaltantes>0 ? 'dominical' as const : 'ordinarias' as const },
  ];
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0" }}>
      {items.map(item => {
        const col = colorCategoria(item.cat, isDark);
        return (
          <div key={item.etiqueta} style={{ flex:"1 1 140px", border:`1px solid var(--border-subtle)`, borderLeft:`3px solid ${col.border}`, borderRadius:10, padding:"10px 14px", background: col.bg }}>
            <div style={{ fontSize:11, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:0.5 }}>{item.etiqueta}</div>
            <div style={{ fontSize:20, fontWeight:700, color: col.text, fontFamily:'Fraunces, serif' }}>{item.valor}h</div>
            <div style={{ height:4, background:'var(--border-subtle)', borderRadius:9999, marginTop:6, overflow:'hidden' }}><div style={{ width:`${Math.min(100,(item.valor/42)*100)}%`, height:'100%', background: col.border }} /></div>
          </div>
        );
      })}
    </div>
  );
}
