import { DiaCalendarioDTO } from "../api/types";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface Props {
  anio: number;
  mes: number; // 1-12
  dias: DiaCalendarioDTO[];
  onSeleccionarDia: (dia: DiaCalendarioDTO) => void;
}

export function MonthCalendar({ anio, mes, dias, onSeleccionarDia }: Props) {
  const primerDiaMes = new Date(Date.UTC(anio, mes - 1, 1));
  // getUTCDay(): 0=domingo..6=sábado -> lo convertimos a offset lunes-primero.
  const offsetLunes = (primerDiaMes.getUTCDay() + 6) % 7;

  const celdas: (DiaCalendarioDTO | null)[] = [
    ...Array(offsetLunes).fill(null),
    ...dias,
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {DIAS_SEMANA.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "#64748b" }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {celdas.map((dia, idx) => {
          if (!dia) return <div key={`vacio-${idx}`} />;

          const esClickeable = dia.estado === "JORNADA_FINALIZADA";
          const fondo = dia.esFestivo ? "#fee2e2" : dia.esFinDeSemana ? "#dbeafe" : "#ffffff";
          const borde = dia.esFestivo ? "#fca5a5" : dia.esFinDeSemana ? "#93c5fd" : "#e2e8f0";

          return (
            <button
              key={dia.fecha}
              onClick={() => esClickeable && onSeleccionarDia(dia)}
              title={dia.nombreFestivo ?? undefined}
              style={{
                textAlign: "left",
                minHeight: 68,
                borderRadius: 8,
                border: `1px solid ${borde}`,
                background: fondo,
                padding: 6,
                cursor: esClickeable ? "pointer" : "default",
                opacity: dia.estado ? 1 : 0.7,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600 }}>{Number(dia.fecha.slice(8, 10))}</div>
              {dia.nombreFestivo && (
                <div style={{ fontSize: 9, color: "#b91c1c", lineHeight: 1.1 }}>{dia.nombreFestivo}</div>
              )}
              {dia.horasTrabajadas > 0 && (
                <div style={{ fontSize: 11, marginTop: 4, color: "#1d4ed8", fontWeight: 600 }}>
                  {dia.horasTrabajadas}h
                </div>
              )}
              {dia.estado === "JORNADA_ACTIVA" && (
                <div style={{ fontSize: 9, color: "#059669", marginTop: 2 }}>● activa</div>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: "#475569" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#dbeafe", border: "1px solid #93c5fd", marginRight: 4 }} />Fin de semana</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#fee2e2", border: "1px solid #fca5a5", marginRight: 4 }} />Festivo</span>
      </div>
    </div>
  );
}
