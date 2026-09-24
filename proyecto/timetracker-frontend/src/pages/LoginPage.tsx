import { useState, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { useTheme } from "../context/ThemeContext";

export function LoginPage() {
  const { login } = useAuth();
  const { toggle, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const [sugerenciasBase] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("login:emails") || "[]");
      const base = Array.isArray(saved) ? saved : [];
      const defaults = ["admin@empresa.com"];
      const uniq = Array.from(new Set([...defaults, ...base].filter(Boolean))) as string[];
      return uniq;
    } catch { return ["admin@empresa.com"]; }
  });
  const sugerenciasFiltradas = email
    ? sugerenciasBase.filter(s => s.toLowerCase().includes(email.toLowerCase()) && s.toLowerCase() !== email.toLowerCase()).slice(0, 5)
    : sugerenciasBase.slice(0, 5);
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(null); setCargando(true);
    try {
      await login(email, password);
      // guardar email para sugerencias futuras
      try {
        const saved = JSON.parse(localStorage.getItem("login:emails") || "[]");
        const arr = Array.isArray(saved) ? saved : [];
        if (!arr.includes(email)) {
          const next = [email, ...arr].slice(0, 10);
          localStorage.setItem("login:emails", JSON.stringify(next));
        }
      } catch {}
    } catch (err) { setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión."); } finally { setCargando(false); }
  };
  return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', padding:16, background:'var(--bg-base)' }}>
      <div style={{ width:'100%', maxWidth:400, background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:16, padding:24, boxShadow:'var(--shadow-soft)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h1 style={{ fontSize:22, margin:0, fontFamily:'Outfit, sans-serif' }}>Control de Jornada</h1>
          <button onClick={toggle} style={{ width:36, height:36, borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-base)', cursor:'pointer' }}>{isDark?'☀':'☾'}</button>
        </div>
        <form onSubmit={onSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ position:'relative' }}>
            <input
              type="email"
              name="email"
              autoComplete="email"
              list="email-sugerencias"
              placeholder="Email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              onFocus={()=>setShowSugerencias(true)}
              onBlur={()=>setTimeout(()=>setShowSugerencias(false),150)}
              required
              style={{ ...inp, width:'100%', boxSizing:'border-box' }}
            />
            <datalist id="email-sugerencias">
              {sugerenciasBase.map(s => <option key={s} value={s} />)}
            </datalist>
            {showSugerencias && sugerenciasFiltradas.length > 0 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:8, boxShadow:'var(--shadow-soft)', zIndex:10, overflow:'hidden' }}>
                {sugerenciasFiltradas.map(s => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={e=>{ e.preventDefault(); setEmail(s); setShowSugerencias(false); }}
                    style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 10px', background:'transparent', border:'none', borderBottom:'1px solid var(--border-subtle)', cursor:'pointer', fontSize:13, color:'var(--text-primary)' }}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              placeholder="Contraseña"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
              style={{ ...inp, width:'100%', boxSizing:'border-box', paddingRight:40 }}
            />
            <button
              type="button"
              onClick={()=>setShowPassword(v=>!v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              title={showPassword ? "Ocultar" : "Mostrar"}
              style={{ position:'absolute', right:8, width:32, height:32, borderRadius:6, border:'1px solid var(--border-subtle)', background:'var(--bg-base)', cursor:'pointer', display:'grid', placeItems:'center', fontSize:14, lineHeight:1, color:'var(--text-secondary)' }}
            >{showPassword ? "🙈" : "👁"}</button>
          </div>
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
