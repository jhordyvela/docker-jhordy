import fs from "fs";
import path from "path";
import pool from "./config/database.js";

const migrationsDir = path.resolve("src/migrations");

async function run() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // 001..., 002...

  console.log("Migrations:", files);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Running ${file}...`);
    await pool.query(sql);
    console.log(`OK ${file}`);
  }

  await pool.end();
  console.log("Done.");
}

run().catch(async (err) => {
  console.error("Migration failed:", err);
  try { await pool.end(); } catch {}
  process.exit(1);
});