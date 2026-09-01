import { ResumenSemanalDTO } from "../api/types";

export function SummaryPanel({ resumen }: { resumen: ResumenSemanalDTO | null }) {
  if (!resumen) return null;

  const items = [
    { etiqueta: "Horas trabajadas (semana)", valor: resumen.horasTrabajadas, color: "#1d4ed8" },
    { etiqueta: "Mínimo semanal", valor: resumen.horasMinimasSemanales, color: "#334155" },
    { etiqueta: "Horas extra", valor: resumen.horasExtra, color: "#059669" },
    { etiqueta: "Horas faltantes", valor: resumen.horasFaltantes, color: resumen.horasFaltantes > 0 ? "#dc2626" : "#059669" },
  ];

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0" }}>
      {items.map((item) => (
        <div
          key={item.etiqueta}
          style={{
            flex: "1 1 160px",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "10px 14px",
            background: "#fff",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b" }}>{item.etiqueta}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.valor}h</div>
        </div>
      ))}
    </div>
  );
}
