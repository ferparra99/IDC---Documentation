import { createContext, useContext, useState, useCallback, ReactNode } from "react";
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

  const login = useCallback(async (email: string, password: string) => {
    const resultado = await api.post<{ token: string; usuario: UsuarioPublico }>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("token", resultado.token);
    localStorage.setItem("usuario", JSON.stringify(resultado.usuario));
    setUsuario(resultado.usuario);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
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
