import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { primerYUltimoDiaSemana, hoyYYYYMMDD } from "../utils/fecha";
import { TopToolbar } from "../components/TopToolbar";

function primerDiaMes(): string { const h = hoyYYYYMMDD(); return `${h.slice(0, 7)}-01`; }

type UsuarioOpt = { id: string; nombre: string; email: string; rol: string };

export function ReportsPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "administrador";
  const { domingo } = primerYUltimoDiaSemana(hoyYYYYMMDD());
  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(domingo);
  const [soloYo, setSoloYo] = useState(!esAdmin);
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // sincroniza soloYo con rol
  useEffect(() => {
    setSoloYo(!esAdmin);
    setSeleccionados(new Set());
  }, [esAdmin]);

  useEffect(() => {
    if (!esAdmin) return;
    if (soloYo) return;
    setCargandoUsuarios(true);
    api.get<UsuarioOpt[]>("/reports/usuarios")
      .then((raw) => {
        const data = Array.isArray(raw) ? raw : (raw as unknown as { data?: UsuarioOpt[] })?.data ?? [];
        setUsuarios(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setUsuarios([]);
      })
      .finally(() => setCargandoUsuarios(false));
  }, [esAdmin, soloYo]);

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seleccionarTodos = () => {
    const arr = Array.isArray(usuarios) ? usuarios : [];
    if (seleccionados.size === arr.length) setSeleccionados(new Set());
    else setSeleccionados(new Set(arr.map((u) => u.id)));
  };

  const descargar = async () => {
    setError(null);
    setCargando(true);
    try {
      let query = `?desde=${desde}&hasta=${hasta}`;
      if (!esAdmin || soloYo) {
        query += `&usuarioId=${usuario!.id}`;
      } else {
        if (seleccionados.size > 0) {
          query += `&usuarioIds=${Array.from(seleccionados).join(",")}`;
        }
        // si 0 seleccionados y !soloYo -> sin param = consolidado todos (adminView)
      }
      const blob = await api.getBlob(`/reports/excel${query}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = !esAdmin || soloYo ? "" : seleccionados.size > 0 ? `_${seleccionados.size}usuarios` : "_todos";
      a.download = `reporte_${desde}_a_${hasta}${suffix}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo generar reporte.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <TopToolbar title="Reportes" subtitle='Plantilla "CUADRO DE HORAS EXTRA Y PERMISOS" + "VIAJES" (.xlsx)' />
      <div style={{ maxWidth: 560, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={eti}>Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={inp} /></label>
        <label style={eti}>Hasta<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={inp} /></label>

        {esAdmin && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={soloYo} onChange={(e) => { setSoloYo(e.target.checked); setSeleccionados(new Set()); }} /> Solo mis registros (desmarca para elegir empleados)
          </label>
        )}

        {esAdmin && !soloYo && (
          <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 8, padding: 12, background: "var(--bg-base)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                Empleados {seleccionados.size > 0 ? `(${seleccionados.size} seleccionados)` : "(vacío = todos)"}
              </span>
              {(Array.isArray(usuarios) ? usuarios.length : 0) > 0 && (
                <button type="button" onClick={seleccionarTodos} style={btnLink}>
                  {seleccionados.size === (Array.isArray(usuarios) ? usuarios.length : 0) ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              )}
            </div>
            {cargandoUsuarios && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Cargando empleados...</span>}
            {!cargandoUsuarios && (Array.isArray(usuarios) ? usuarios.length : 0) === 0 && (
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                No se pudo cargar lista (se generará consolidado de todos). Si ves este mensaje, verifica que el backend tenga el endpoint <code>/reports/usuarios</code>.
              </span>
            )}
            <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
              {(Array.isArray(usuarios) ? usuarios : []).map((u) => (
                <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-primary)", cursor: "pointer", padding: "4px 6px", borderRadius: 6, background: seleccionados.has(u.id) ? "var(--bg-surface)" : "transparent", border: seleccionados.has(u.id) ? "1px solid var(--border-subtle)" : "1px solid transparent" }}>
                  <input type="checkbox" checked={seleccionados.has(u.id)} onChange={() => toggleSeleccion(u.id)} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.nombre || u.email} <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>({u.email}) {u.rol ? `· ${u.rol}` : ""}</span>
                  </span>
                </label>
              ))}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Si no eliges ninguno, se exportan <b>todos los empleados</b> (una hoja por usuario). Si eliges varios, cada usuario tendrá su par de hojas `HORAS`/`VIAJES` en el mismo archivo.
            </span>
          </div>
        )}

        {error && <p style={errSt}>{error}</p>}
        <button onClick={descargar} disabled={cargando} style={btnPri}>{cargando ? "Generando..." : "Descargar Excel"}</button>
      </div>
    </div>
  );
}
const eti: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-secondary)" };
const inp: React.CSSProperties = { padding: 10, borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 16 };
const btnPri: React.CSSProperties = { padding: "12px 16px", borderRadius: 8, background: "var(--cta-bg)", color: "var(--cta-text)", border: "none", fontWeight: 700, cursor: "pointer", width: "100%" };
const btnLink: React.CSSProperties = { background: "none", border: "none", color: "var(--accent-primary)", cursor: "pointer", fontSize: 12, fontWeight: 600 };
const errSt: React.CSSProperties = { color: "var(--accent-danger)", fontSize: 13, background: "var(--bg-base)", padding: 8, borderRadius: 8, border: "1px solid var(--border-subtle)" };
