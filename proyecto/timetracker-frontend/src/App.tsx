import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { LoginPage } from "./pages/LoginPage";
import { AttendancePage } from "./pages/AttendancePage";
import { CalendarPage } from "./pages/CalendarPage";
import { LeavesPage } from "./pages/LeavesPage";
import { TripsPage } from "./pages/TripsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AdminLeavesPage } from "./pages/AdminLeavesPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { useTheme } from "./context/ThemeContext";

type Tab = "fichaje" | "calendario" | "permisos" | "viajes" | "reportes" | "admin-permisos" | "admin-usuarios";

function Shell() {
  const { usuario, logout } = useAuth();
  const { toggle, isDark } = useTheme();
  const bp = useBreakpoint();
  const allTabs: Tab[] = ['fichaje','calendario','permisos','viajes','reportes','admin-permisos','admin-usuarios'];
  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash.replace('#','') as Tab;
    return (allTabs.includes(h) ? h : 'fichaje') as Tab;
  });
  useEffect(() => { window.location.hash = tab; }, [tab]);
  // Si usuario no es admin y estaba en pestaña admin, volver a fichaje
  useEffect(() => {
    if (usuario && usuario.rol !== 'administrador' && (tab === 'admin-permisos' || tab === 'admin-usuarios')) {
      setTab('fichaje');
    }
  }, [usuario, tab]);
  // Al iniciar sesión, siempre aterrizar en fichaje (requisito)
  const prevUsuarioRef = useRef(usuario);
  useEffect(() => {
    if (usuario && !prevUsuarioRef.current) {
      setTab('fichaje');
      window.location.hash = 'fichaje';
    }
    prevUsuarioRef.current = usuario;
  }, [usuario]);

  if (!usuario) return <LoginPage />;

  const showBottomNav = bp === 'mobile';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {!showBottomNav && <Sidebar tab={tab} setTab={setTab} />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, maxWidth: 1440, width: '100%', margin: '0 auto', padding: showBottomNav ? '12px 12px 80px' : '12px 16px 16px' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13 }}>
              <strong style={{ fontFamily: 'Outfit, sans-serif' }}>{usuario.nombre}</strong>
              <span style={{ color: 'var(--text-secondary)' }}> · {usuario.rol}</span>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button onClick={toggle} title={isDark ? 'Modo claro' : 'Modo oscuro'} style={{ width:36, height:36, borderRadius:8, border:'1px solid var(--border-subtle)', background:'var(--bg-surface)', cursor:'pointer', fontSize:16, color:'var(--text-primary)' }}>{isDark ? '☀' : '☾'}</button>
              <button onClick={logout} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
                Cerrar sesión
              </button>
            </div>
          </header>

          {tab === "fichaje" && <AttendancePage />}
          {tab === "calendario" && <CalendarPage />}
          {tab === "permisos" && <LeavesPage />}
          {tab === "viajes" && <TripsPage />}
          {tab === "reportes" && <ReportsPage />}
          {tab === "admin-permisos" && usuario.rol === 'administrador' && <AdminLeavesPage />}
          {tab === "admin-usuarios" && usuario.rol === 'administrador' && <AdminUsersPage />}
        </div>
      </div>
      {showBottomNav && <BottomNav tab={tab} setTab={setTab} />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ThemeProvider>
  );
}
