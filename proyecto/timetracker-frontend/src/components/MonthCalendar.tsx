import { DiaCalendarioDTO } from "../api/types";
import { useTheme } from "../context/ThemeContext";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function MonthCalendar({ anio, mes, dias, onSeleccionarDia }: { anio: number; mes: number; dias: DiaCalendarioDTO[]; onSeleccionarDia: (dia: DiaCalendarioDTO) => void }) {
  const { isDark } = useTheme();
  const primerDiaMes = new Date(Date.UTC(anio, mes - 1, 1));
  const offsetLunes = (primerDiaMes.getUTCDay() + 6) % 7;
  const celdas: (DiaCalendarioDTO | null)[] = [...Array(offsetLunes).fill(null), ...dias];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {DIAS_SEMANA.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {celdas.map((dia, idx) => {
          if (!dia) return <div key={`vacio-${idx}`} />;
          const esClickeable = dia.estado === "JORNADA_FINALIZADA";
          const fondo = dia.esFestivo ? (isDark ? "#3A1F1A" : "#fee2e2") : dia.esFinDeSemana ? (isDark ? "#1A2233" : "#dbeafe") : "var(--bg-surface)";
          const borde = dia.esFestivo ? (isDark ? "#7A3A2E" : "#fca5a5") : dia.esFinDeSemana ? (isDark ? "#2A3A55" : "#93c5fd") : "var(--border-subtle)";
          const pct = Math.min(100, (dia.horasTrabajadas / 8) * 100);
          return (
            <button
              key={dia.fecha}
              onClick={() => esClickeable && onSeleccionarDia(dia)}
              title={dia.nombreFestivo ?? undefined}
              style={{
                textAlign: "left", minHeight: 92, borderRadius: 10, border: `1px solid ${borde}`, background: fondo,
                padding: 8, cursor: esClickeable ? "pointer" : "default", opacity: dia.estado ? 1 : 0.7,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Fraunces, serif' }}>{Number(dia.fecha.slice(8, 10))}</div>
              {dia.nombreFestivo && <div style={{ fontSize: 9, color: isDark ? "#FCA5A5" : "#b91c1c", lineHeight: 1.1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dia.nombreFestivo}</div>}
              <div style={{ flex:1 }} />
              {dia.horasTrabajadas > 0 ? (
                <>
                  <div style={{ fontSize: 13, color: "var(--accent-primary)", fontWeight: 700, fontFamily:'JetBrains Mono, monospace' }}>{dia.horasTrabajadas}h</div>
                  <div style={{ height: 6, background: "var(--border-subtle)", borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: dia.esFestivo ? '#D6B85E' : dia.esFinDeSemana ? '#6E6E78' : 'var(--accent-primary)', transition: 'width 300ms' }} />
                  </div>
                </>
              ) : <div style={{ height: 6 }} />}
              {dia.estado === "JORNADA_ACTIVA" && <div style={{ fontSize: 10, color: "#10B981", fontWeight:600 }}>● activa</div>}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: "var(--text-secondary)", flexWrap:'wrap' }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: isDark?"#1A2233":"#dbeafe", border: "1px solid var(--border-subtle)", marginRight: 4, borderRadius:2 }} />Fin de semana</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: isDark?"#3A1F1A":"#fee2e2", border: "1px solid var(--border-subtle)", marginRight: 4, borderRadius:2 }} />Festivo</span>
      </div>
    </div>
  );
}
