import { useState, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { useTheme } from "../context/ThemeContext";

export function LoginPage() {
  const { login } = useAuth();
  const { toggle, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(null); setCargando(true);
    try { await login(email, password); } catch (err) { setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión."); } finally { setCargando(false); }
  };
  return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', padding:16, background:'var(--bg-base)' }}>
      <div style={{ width:'100%', maxWidth:400, background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:16, padding:24, boxShadow:'var(--shadow-soft)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, margin:0, fontFamily:'Fraunces, serif' }}>Control de Jornada</h1>
          <button onClick={toggle} style={{ width:36, height:36, borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-base)', cursor:'pointer' }}>{isDark?'☀':'☾'}</button>
        </div>
        <form onSubmit={onSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required style={inp} />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e)=>setPassword(e.target.value)} required style={inp} />
          {error && <div style={{ color:"var(--accent-danger)", fontSize:13, background:'var(--bg-base)', padding:8, borderRadius:8, border:'1px solid var(--border-subtle)' }}>{error}</div>}
          <button type="submit" disabled={cargando} style={{ padding:12, borderRadius:8, background:"var(--cta-bg)", color:"var(--cta-text)", border:"none", fontWeight:700, cursor:"pointer", opacity: cargando?0.6:1 }}>
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
const inp: React.CSSProperties = { padding:10, borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-base)', color:'var(--text-primary)', fontSize:16, outline:'none' };
