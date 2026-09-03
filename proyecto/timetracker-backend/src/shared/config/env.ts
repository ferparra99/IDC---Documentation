import "dotenv/config";

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno requerida: ${nombre}`);
  }
  return valor;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: requerida("DATABASE_URL"),
  jwtSecret: requerida("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@empresa.com",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? "CambiarEnProduccion123",
  seedAdminNombre: process.env.SEED_ADMIN_NOMBRE ?? "Administrador Inicial",
  nodeEnv: process.env.NODE_ENV ?? "development",
  logLevel: process.env.LOG_LEVEL ?? "info",
} as const;

// Zona horaria de referencia de todo el sistema (ver docs/REQUIREMENTS.md y docs/STATE_MACHINE.md).
export const ZONA_HORARIA = "America/Bogota";
