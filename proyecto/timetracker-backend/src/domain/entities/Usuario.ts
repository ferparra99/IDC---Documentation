export type Rol = "empleado" | "administrador";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: Rol;
  activo: boolean;
}

export interface UsuarioPublico {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

export function aUsuarioPublico(usuario: Usuario): UsuarioPublico {
  return { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
}
