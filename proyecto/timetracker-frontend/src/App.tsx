import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { AttendancePage } from "./pages/AttendancePage";
import { CalendarPage } from "./pages/CalendarPage";
import { LeavesPage } from "./pages/LeavesPage";
import { TripsPage } from "./pages/TripsPage";
import { ReportsPage } from "./pages/ReportsPage";

function Shell() {
  const { usuario, logout } = useAuth();
  const [tab, setTab] = useState<"fichaje" | "calendario" | "permisos" | "viajes" | "reportes">("fichaje");

  if (!usuario) return <LoginPage />;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <strong>{usuario.nombre}</strong>
          <span style={{ color: "#64748b", fontSize: 13 }}> · {usuario.rol}</span>
        </div>
        <button onClick={logout} style={{ background: "none", border: "none", color: "#1d4ed8", cursor: "pointer" }}>
          Cerrar sesión
        </button>
      </header>

      <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <TabButton activo={tab === "fichaje"} onClick={() => setTab("fichaje")}>Fichaje</TabButton>
        <TabButton activo={tab === "calendario"} onClick={() => setTab("calendario")}>Calendario</TabButton>
        <TabButton activo={tab === "permisos"} onClick={() => setTab("permisos")}>Permisos</TabButton>
        <TabButton activo={tab === "viajes"} onClick={() => setTab("viajes")}>Viajes</TabButton>
        <TabButton activo={tab === "reportes"} onClick={() => setTab("reportes")}>Reportes</TabButton>
      </nav>

      {tab === "fichaje" && <AttendancePage />}
      {tab === "calendario" && <CalendarPage />}
      {tab === "permisos" && <LeavesPage />}
      {tab === "viajes" && <TripsPage />}
      {tab === "reportes" && <ReportsPage />}
    </div>
  );
}

function TabButton({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: activo ? "#1d4ed8" : "#fff",
        color: activo ? "#fff" : "#1e293b",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
