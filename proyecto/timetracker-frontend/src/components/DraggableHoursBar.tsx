import { useRef, useState, useCallback } from "react";

interface Props {
  /** Minutos desde medianoche (0-1440) */
  inicioMin: number;
  finMin: number;
  onChange: (inicioMin: number, finMin: number) => void;
}

const MINUTOS_DIA = 24 * 60;

function minutosAHora(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(min % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Timeline de 24h (00:00-23:59) con dos manijas arrastrables que representan
 * hora de inicio y hora de fin. Implementado con Pointer Events nativos para
 * no depender de una librería de drag-and-drop — cumple el requisito de
 * "modo edición por barras arrastrables" del módulo de calendario (5.2).
 */
export function DraggableHoursBar({ inicioMin, finMin, onChange }: Props) {
  const barraRef = useRef<HTMLDivElement>(null);
  const [arrastrando, setArrastrando] = useState<"inicio" | "fin" | null>(null);

  const minutosDesdeEvento = useCallback((clientX: number): number => {
    const barra = barraRef.current;
    if (!barra) return 0;
    const rect = barra.getBoundingClientRect();
    const proporcion = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    // Redondea a pasos de 15 minutos para que sea fácil de manipular.
    return Math.round((proporcion * MINUTOS_DIA) / 15) * 15;
  }, []);

  const onPointerDown = (cual: "inicio" | "fin") => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setArrastrando(cual);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!arrastrando) return;
    const min = minutosDesdeEvento(e.clientX);
    if (arrastrando === "inicio") {
      onChange(Math.min(min, finMin - 15), finMin);
    } else {
      onChange(inicioMin, Math.max(min, inicioMin + 15));
    }
  };

  const onPointerUp = () => setArrastrando(null);

  const pctInicio = (inicioMin / MINUTOS_DIA) * 100;
  const pctFin = (finMin / MINUTOS_DIA) * 100;

  return (
    <div style={{ userSelect: "none" }}>
      <div
        ref={barraRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: "relative",
          height: 36,
          borderRadius: 8,
          background: "linear-gradient(to right, #334155 0%, #334155 25%, #f1f5f9 25%, #f1f5f9 79.17%, #334155 79.17%, #334155 100%)",
          border: "1px solid #cbd5e1",
        }}
      >
        {/* Franja que representa el rango seleccionado */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${pctInicio}%`,
            width: `${pctFin - pctInicio}%`,
            background: "rgba(59,130,246,0.55)",
            borderLeft: "2px solid #1d4ed8",
            borderRight: "2px solid #1d4ed8",
          }}
        />
        {/* Manija de inicio */}
        <div
          onPointerDown={onPointerDown("inicio")}
          title={`Inicio: ${minutosAHora(inicioMin)}`}
          style={{
            position: "absolute",
            top: -4,
            left: `calc(${pctInicio}% - 7px)`,
            width: 14,
            height: 44,
            borderRadius: 4,
            background: "#1d4ed8",
            cursor: "ew-resize",
          }}
        />
        {/* Manija de fin */}
        <div
          onPointerDown={onPointerDown("fin")}
          title={`Fin: ${minutosAHora(finMin)}`}
          style={{
            position: "absolute",
            top: -4,
            left: `calc(${pctFin}% - 7px)`,
            width: 14,
            height: 44,
            borderRadius: 4,
            background: "#1d4ed8",
            cursor: "ew-resize",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 6 }}>
        <span>Inicio: <strong>{minutosAHora(inicioMin)}</strong></span>
        <span>Fin: <strong>{minutosAHora(finMin)}</strong></span>
      </div>
      <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
        La franja oscura de los extremos representa la jornada nocturna (19:00–06:00). Arrastra las barras azules para ajustar.
      </p>
    </div>
  );
}
