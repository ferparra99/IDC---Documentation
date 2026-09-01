import { Pool } from "pg";
import { env } from "../../shared/config/env";

export const pool = new Pool({ connectionString: env.databaseUrl });
