import { DiaCalendarioDTO, PermisoDTO } from "../api/types";
import { useTheme } from "../context/ThemeContext";
import { formatearEstado } from "../utils/estado";

function badgePermiso(permiso: PermisoDTO | undefined, isDark: boolean): { bg: string; color: string; border: string; label: string } | null {
  if (!permiso) return null;
  if (permiso.estado === "APROBADO") return { bg: isDark ? "#14532D" : "#DCFCE7", color: isDark ? "#86EFAC" : "#166534", border: isDark ? "#166534" : "#86EFAC", label: `Permiso ${permiso.tipo} ${permiso.horas}h ✓` };
  if (permiso.estado === "ENVIADO") return { bg: isDark ? "#78350F" : "#FEF3C7", color: isDark ? "#FDE68A" : "#92400E", border: isDark ? "#92400E" : "#FDE68A", label: `Permiso ${permiso.tipo} ${permiso.horas}h · pendiente` };
  if (permiso.estado === "RECHAZADO") return { bg: isDark ? "#7F1D1D" : "#FEE2E2", color: isDark ? "#FCA5A5" : "#991B1B", border: isDark ? "#991B1B" : "#FCA5A5", label: `Permiso rechazado` };
  return { bg: isDark ? "#1F2A3A" : "#F1F5F9", color: "var(--text-secondary)", border: "var(--border-subtle)", label: `Permiso borrador ${permiso.horas}h` };
}

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function MonthCalendar({ anio, mes, dias, permisosMap, onSeleccionarDia }: { anio: number; mes: number; dias: DiaCalendarioDTO[]; permisosMap?: Record<string, PermisoDTO>; onSeleccionarDia: (dia: DiaCalendarioDTO) => void }) {
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
          const fondo = dia.esFestivo ? (isDark ? "#3A1F1A" : "#fee2e2") : dia.esFinDeSemana ? (isDark ? "#1A2233" : "#dbeafe") : "var(--bg-surface)";
          const borde = dia.esFestivo ? (isDark ? "#7A3A2E" : "#fca5a5") : dia.esFinDeSemana ? (isDark ? "#2A3A55" : "#93c5fd") : "var(--border-subtle)";
          const pct = Math.min(100, (dia.horasTrabajadas / 8) * 100);
          const per = permisosMap?.[dia.fecha];
          const pb = badgePermiso(per, isDark);
          return (
            <button
              key={dia.fecha}
              onClick={() => onSeleccionarDia(dia)}
              title={[dia.nombreFestivo, pb?.label].filter(Boolean).join(" · ") || undefined}
              style={{
                textAlign: "left", minHeight: 92, borderRadius: 10, border: `1px solid ${borde}`, background: fondo,
                padding: 8, cursor: "pointer", opacity: 1,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>{Number(dia.fecha.slice(8, 10))}</div>
              {dia.nombreFestivo && <div style={{ fontSize: 9, color: isDark ? "#FCA5A5" : "#b91c1c", lineHeight: 1.1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dia.nombreFestivo}</div>}
              {pb && <div style={{ fontSize: 8, fontWeight:700, padding:'2px 6px', borderRadius:9999, background: pb.bg, color: pb.color, border:`1px solid ${pb.border}`, lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={per?.descripcion}>{pb.label}</div>}
              <div style={{ flex:1 }} />
              {dia.horasTrabajadas > 0 ? (
                <>
                  <div style={{ fontSize: 11, color: "var(--accent-primary)", fontWeight: 700, fontFamily:'Outfit, monospace' }}>{dia.horasTrabajadas}h · <span style={{fontSize:9}}>{formatearEstado(dia.estado as any, { estado: dia.estado, editadoManualmente:false, origen: dia.estado==='JORNADA_FINALIZADA'?'fichaje':null } as any)}</span></div>
                  <div style={{ height: 6, background: "var(--border-subtle)", borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: dia.esFestivo ? '#D6B85E' : dia.esFinDeSemana ? '#6E6E78' : 'var(--accent-primary)', transition: 'width 300ms' }} />
                  </div>
                </>
              ) : <div style={{ height: 6 }} />}
              {dia.estado && <div style={{ fontSize: 9, color: dia.estado==='JORNADA_ACTIVA' ? "#10B981" : "var(--text-tertiary)", fontWeight:600, marginTop:2 }}>{formatearEstado(dia.estado as any, null)}</div>}
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
