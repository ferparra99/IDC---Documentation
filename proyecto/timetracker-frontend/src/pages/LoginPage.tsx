import { useState, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Control de Jornada</h1>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
        />
        {error && <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>}
        <button
          type="submit"
          disabled={cargando}
          style={{ padding: 10, borderRadius: 6, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 600 }}
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
