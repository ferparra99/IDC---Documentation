import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { LoginPage } from "./pages/LoginPage";
import { AttendancePage } from "./pages/AttendancePage";
import { CalendarPage } from "./pages/CalendarPage";
import { LeavesPage } from "./pages/LeavesPage";
import { TripsPage } from "./pages/TripsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { useTheme } from "./context/ThemeContext";

type Tab = "fichaje" | "calendario" | "permisos" | "viajes" | "reportes";

function Shell() {
  const { usuario, logout } = useAuth();
  const { toggle, isDark } = useTheme();
  const bp = useBreakpoint();
  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash.replace('#','') as Tab;
    return (['fichaje','calendario','permisos','viajes','reportes'].includes(h) ? h : 'fichaje') as Tab;
  });
  useEffect(() => { window.location.hash = tab; }, [tab]);

  if (!usuario) return <LoginPage />;

  const showBottomNav = bp === 'mobile';
  const showRail = bp === 'tablet';
  const showSidebar = bp === 'desktop';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {showSidebar && <Sidebar tab={tab} setTab={setTab} />}
      {showRail && <Sidebar tab={tab} setTab={setTab} collapsed />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', padding: showBottomNav ? '16px 16px 80px' : '16px 24px 24px' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13 }}>
              <strong style={{ fontFamily: 'Fraunces, serif' }}>{usuario.nombre}</strong>
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
