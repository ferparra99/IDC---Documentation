import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { api } from "../api/client";
import { UsuarioPublico } from "../api/types";

interface AuthContextValue {
  usuario: UsuarioPublico | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioPublico | null>(() => {
    const guardado = localStorage.getItem("usuario");
    return guardado ? JSON.parse(guardado) : null;
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
