import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const dbHost = process.env.DB_HOST;

const isLocal =
  dbHost === "localhost" ||
  dbHost === "127.0.0.1" ||
  dbHost === "db" ||
  dbHost === "postgres";

const useSsl = process.env.DB_SSL === "true" && !isLocal;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });

export async function conectar() {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Conexión exitosa a la base de datos");
  } catch (error) {
    console.error("❌ Error al conectar a la base de datos:", error);
    throw error;
  }
}

export default pool;