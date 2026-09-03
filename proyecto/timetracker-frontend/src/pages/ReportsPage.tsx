import { useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { primerYUltimoDiaSemana, hoyYYYYMMDD } from "../utils/fecha";

function primerDiaDelMesActual(): string {
  const hoy = hoyYYYYMMDD();
  return `${hoy.slice(0, 7)}-01`;
}

export function ReportsPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "administrador";

  const { domingo } = primerYUltimoDiaSemana(hoyYYYYMMDD());
  const [desde, setDesde] = useState(primerDiaDelMesActual());
  const [hasta, setHasta] = useState(domingo);
  const [soloYo, setSoloYo] = useState(!esAdmin);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const descargar = async () => {
    setError(null);
    setCargando(true);
    try {
      const usuarioIdParam = !esAdmin || soloYo ? `&usuarioId=${usuario!.id}` : "";
      const blob = await api.getBlob(`/reports/excel?desde=${desde}&hasta=${hasta}${usuarioIdParam}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_${desde}_a_${hasta}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo generar el reporte.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: 420 }}>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>Reporte Excel</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        Genera un archivo <code>.xlsx</code> con las hojas <strong>"Horas laboradas"</strong> y{" "}
        <strong>"Viajes laborados"</strong> del rango seleccionado.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={etiqueta}>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={input} />
        </label>
        <label style={etiqueta}>
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={input} />
        </label>

        {esAdmin && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={soloYo} onChange={(e) => setSoloYo(e.target.checked)} />
            Solo mis registros (si lo desmarcas, exporta el consolidado de todos los empleados)
          </label>
        )}

        {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}

        <button onClick={descargar} disabled={cargando} style={botonPrimario}>
          {cargando ? "Generando..." : "Descargar Excel"}
        </button>
      </div>
    </div>
  );
}

const etiqueta: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#334155" };
const input: React.CSSProperties = { padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 };
const botonPrimario: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" };
