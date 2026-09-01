import bcrypt from "bcryptjs";
import { pool } from "./pool";
import { env } from "../../shared/config/env";
import { fechaBogotaHoy } from "../../shared/utils/tiempo";

/**
 * Variables de sistema necesarias para el cálculo de horas de Fase 1
 * (docs/REQUIREMENTS.md sección 4), más `valorViajePorDefecto` (Fase 4).
 * Las variables de recargos monetarios de nómina (`recargoNocturno`, etc.)
 * se sembrarán cuando se implemente el módulo que las usa (liquidación).
 */
const CONFIGURACION_INICIAL: Array<{ clave: string; valor: unknown }> = [
  { clave: "horaEntradaEstandar", valor: "08:00" },
  { clave: "horaSalidaEstandar", valor: "17:00" },
  { clave: "horasMinimasSemanales", valor: 42 },
  { clave: "horasOrdinariasPorDia", valor: 8 },
  { clave: "inicioHorarioNocturno", valor: "19:00" },
  { clave: "finHorarioNocturno", valor: "06:00" },
  { clave: "valorViajePorDefecto", valor: 5000 },
];

async function main() {
  const client = await pool.connect();
  try {
    const hoy = fechaBogotaHoy();

    // --- Usuario administrador inicial ---
    const { rows: existentes } = await client.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [env.seedAdminEmail]
    );

    let adminId: string;
    if (existentes.length > 0) {
      adminId = existentes[0].id;
      console.log(`Usuario administrador ya existe (${env.seedAdminEmail}), no se duplica.`);
    } else {
      const passwordHash = await bcrypt.hash(env.seedAdminPassword, 10);
      const { rows } = await client.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol)
         VALUES ($1, $2, $3, 'administrador') RETURNING id`,
        [env.seedAdminNombre, env.seedAdminEmail, passwordHash]
      );
      adminId = rows[0].id;
      console.log(`Usuario administrador creado: ${env.seedAdminEmail}`);
    }

    // --- Configuración inicial (solo si no hay una versión vigente para esa clave) ---
    for (const { clave, valor } of CONFIGURACION_INICIAL) {
      const { rows } = await client.query(
        `SELECT id FROM configuracion_sistema WHERE clave = $1 AND vigente_hasta IS NULL`,
        [clave]
      );
      if (rows.length > 0) {
        console.log(`(sin cambios) configuración '${clave}' ya tiene una versión vigente.`);
        continue;
      }
      await client.query(
        `INSERT INTO configuracion_sistema (clave, valor, vigente_desde, creado_por)
         VALUES ($1, $2, $3, $4)`,
        [clave, JSON.stringify(valor), hoy, adminId]
      );
      console.log(`Configuración sembrada: ${clave} = ${JSON.stringify(valor)}`);
    }

    console.log("Seed completado.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Error ejecutando seed:", err);
  process.exit(1);
});
