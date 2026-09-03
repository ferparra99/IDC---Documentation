const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

function obtenerToken(): string | null {
  return localStorage.getItem("token");
}

function obtenerRefreshToken(): string | null {
  return localStorage.getItem("refreshToken");
}

function limpiarSesion() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("usuario");
  // El AuthContext escucha este evento para reflejar el logout en la UI
  // sin que api/client.ts tenga que conocer React (mantiene las capas separadas).
  window.dispatchEvent(new Event("auth:sesion-expirada"));
}

let refrescoEnCurso: Promise<boolean> | null = null;

/**
 * Intenta renovar el access token usando el refresh token guardado.
 * Se deduplica con `refrescoEnCurso` para que, si varias requests fallan con
 * 401 al mismo tiempo, solo se dispare una llamada a /auth/refresh.
 */
async function intentarRefrescar(): Promise<boolean> {
  if (!refrescoEnCurso) {
    refrescoEnCurso = (async () => {
      const refreshToken = obtenerRefreshToken();
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const body = await res.json();
        localStorage.setItem("token", body.data.token);
        localStorage.setItem("refreshToken", body.data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })();
  }
  const resultado = await refrescoEnCurso;
  refrescoEnCurso = null;
  return resultado;
}

async function request<T>(path: string, options: RequestInit = {}, esReintento = false): Promise<T> {
  const token = obtenerToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !esReintento && path !== "/auth/refresh" && path !== "/auth/login") {
    const renovado = await intentarRefrescar();
    if (renovado) return request<T>(path, options, true);
    limpiarSesion();
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = body?.error ?? { code: "ERROR_DESCONOCIDO", message: "Error de red" };
    throw new ApiError(err.code, err.message, res.status);
  }
  return body.data as T;
}

async function requestBlob(path: string): Promise<Blob> {
  const token = obtenerToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = body?.error ?? { code: "ERROR_DESCONOCIDO", message: "Error de red" };
    throw new ApiError(err.code, err.message, res.status);
  }
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  getBlob: requestBlob,
};
