import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { api } from "../api/client";
import { UsuarioPublico } from "../api/types";

interface AuthContextValue {
  usuario: UsuarioPublico | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function rolDesdeToken(): string | null {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.rol ?? null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioPublico | null>(() => {
    try {
      const esInicioApp = !sessionStorage.getItem("appStarted");
      if (esInicioApp) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("usuario");
        sessionStorage.setItem("appStarted", "true");
        return null;
      }
    } catch {
      return null;
    }
    const guardado = localStorage.getItem("usuario");
    if (!guardado) return null;
    try {
      const parsed: UsuarioPublico = JSON.parse(guardado);
      // Mitigación rol spoofing: deriva rol del JWT (fuente de verdad), no solo de localStorage
      const rolToken = rolDesdeToken() as UsuarioPublico["rol"] | null;
      if (rolToken && parsed.rol !== rolToken) {
        const corregido = { ...parsed, rol: rolToken };
        localStorage.setItem("usuario", JSON.stringify(corregido));
        return corregido;
      }
      return parsed;
    } catch { return null; }
  });

  // Si api/client.ts no logra renovar la sesión (refresh token vencido/revocado),
  // dispara este evento para que la UI vuelva al login sin que ambos módulos
  // se conozcan directamente entre sí.
  useEffect(() => {
    const onSesionExpirada = () => setUsuario(null);
    window.addEventListener("auth:sesion-expirada", onSesionExpirada);
    return () => window.removeEventListener("auth:sesion-expirada", onSesionExpirada);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const resultado = await api.post<{ token: string; refreshToken: string; usuario: UsuarioPublico }>(
      "/auth/login",
      { email, password }
    );
    localStorage.setItem("token", resultado.token);
    localStorage.setItem("refreshToken", resultado.refreshToken);
    localStorage.setItem("usuario", JSON.stringify(resultado.usuario));
    try { sessionStorage.setItem("appStarted", "true"); } catch {}
    setUsuario(resultado.usuario);
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      // Revocación en el backend, best-effort: si falla igual cerramos sesión localmente.
      api.post("/auth/logout", { refreshToken }).catch(() => {});
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("usuario");
    setUsuario(null);
  }, []);

  return <AuthContext.Provider value={{ usuario, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
