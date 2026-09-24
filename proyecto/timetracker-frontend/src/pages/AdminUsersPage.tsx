import { useEffect, useState, FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { UsuarioPublico } from "../api/types";
import { TopToolbar } from "../components/TopToolbar";

export function AdminUsersPage() {
  const [usuarios, setUsuarios] = useState<UsuarioPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "empleado" as UsuarioPublico["rol"] });
  const [creando, setCreando] = useState(false);

  const cargar = async () => {
    setCargando(true); setError(null);
    try {
      const data = await api.get<UsuarioPublico[]>("/users");
      const arr = Array.isArray(data) ? data : (data as any).data ?? [];
      setUsuarios(arr);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar usuarios.");
    } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const onCrear = async (e: FormEvent) => {
    e.preventDefault(); setError(null); setExito(null); setCreando(true);
    try {
      const creado = await api.post<UsuarioPublico>("/users", { ...form });
      const u = (creado as any).data ?? creado;
      setUsuarios(prev => [u as UsuarioPublico, ...prev]);
      setExito(`Usuario ${(u as UsuarioPublico).email} creado.`);
      setForm({ nombre: "", email: "", password: "", rol: "empleado" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear usuario.");
    } finally { setCreando(false); }
  };

  return (
    <div>
      <TopToolbar title="Crear usuarios" subtitle="Solo administradores - crea usuarios tipo empleado" />
      <div style={{ maxWidth: 640, display:'flex', flexDirection:'column', gap:16 }}>
        {error && <div style={errSt}>{error}</div>}
        {exito && <div style={okSt}>{exito}</div>}

        <form onSubmit={onCrear} style={{ display:'flex', flexDirection:'column', gap:12, background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:16 }}>
          <label style={eti}>Nombre<input required value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} style={inp} placeholder="Nombre completo" /></label>
          <label style={eti}>Email<input required type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} style={inp} placeholder="empleado@empresa.com" /></label>
          <label style={eti}>Contraseña<input required type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} style={inp} placeholder="Mín 6 caracteres" /></label>
          <label style={eti}>Rol
            <select value={form.rol} onChange={e=>setForm({...form, rol: e.target.value as any})} style={inp}>
              <option value="empleado">empleado</option>
              <option value="administrador">administrador</option>
            </select>
          </label>
          <button type="submit" disabled={creando} style={{ ...btnPri, opacity: creando?0.6:1 }}>{creando ? "Creando..." : "Crear usuario"}</button>
        </form>

        <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:12 }}>
          <h3 style={{ margin:0, fontFamily:'Outfit, sans-serif', fontSize:14 }}>Usuarios existentes ({usuarios.length})</h3>
          {cargando ? <p style={{ color:'var(--text-secondary)', fontSize:13 }}>Cargando...</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:10, maxHeight:360, overflow:'auto' }}>
              {usuarios.map(u => (
                <div key={u.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', border:'1px solid var(--border-subtle)', borderRadius:8, background:'var(--bg-base)' }}>
                  <div style={{ fontSize:13 }}><strong>{u.nombre}</strong> <span style={{ color:'var(--text-secondary)' }}>{u.email}</span></div>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:9999, background: u.rol==='administrador' ? 'var(--accent-primary-muted)' : 'var(--bg-surface)', border:'1px solid var(--border-subtle)', fontWeight:700, color: u.rol==='administrador' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{u.rol}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={cargar} style={{ ...btnSec, marginTop:10, width:'100%' }}>Recargar lista</button>
        </div>
      </div>
    </div>
  );
}

const eti: React.CSSProperties = { display:'flex', flexDirection:'column', gap:6, fontSize:13, color:'var(--text-secondary)' };
const inp: React.CSSProperties = { padding:10, borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-base)', color:'var(--text-primary)', fontSize:14 };
const btnPri: React.CSSProperties = { padding:'12px 16px', borderRadius:8, background:'var(--cta-bg)', color:'var(--cta-text)', border:'none', fontWeight:700, cursor:'pointer' };
const btnSec: React.CSSProperties = { padding:'8px 12px', borderRadius:8, background:'var(--bg-surface)', color:'var(--text-primary)', border:'1px solid var(--border-subtle)', fontWeight:600, cursor:'pointer', fontSize:13 };
const errSt: React.CSSProperties = { color:'var(--accent-danger)', fontSize:13, background:'var(--bg-surface)', padding:8, borderRadius:8, border:'1px solid var(--border-subtle)' };
const okSt: React.CSSProperties = { color:'#A8E9C4', fontSize:13, background:'#16302A', padding:8, borderRadius:8, border:'1px solid #6FCB9A' };
