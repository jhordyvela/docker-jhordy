#!/usr/bin/env node
// inspect_and_dedupe.js
// Node helper to inspect duplicates in `favoritos` and optionally dedupe.
// Usage:
//  node inspect_and_dedupe.js            -> shows counts and duplicates
//  node inspect_and_dedupe.js --client "manuel"  -> shows rows for client named 'manuel'
//  node inspect_and_dedupe.js --dedupe   -> creates backup table and deletes duplicates (USE WITH CAUTION)

const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'postgres',
});

const argv = require('minimist')(process.argv.slice(2));
const doDedupe = argv.dedupe || false;
const clientName = argv.client || argv.c || null;

(async function main(){
  try {
    console.log('Conectando a la base de datos...');

    const total = await pool.query('SELECT count(*)::int AS total FROM favoritos');
    console.log('Total favoritos:', total.rows[0].total);

    const dupQuery = `SELECT cliente_id, producto_id, count(*) AS cnt
      FROM favoritos
      GROUP BY cliente_id, producto_id
      HAVING count(*) > 1
      ORDER BY cnt DESC
      LIMIT 100`;
    const dups = await pool.query(dupQuery);
    console.log('Duplicados (cliente_id, producto_id, cnt):', dups.rows.length);
    console.table(dups.rows);

    if (clientName) {
      console.log(`Buscando cliente con nombre LIKE '%${clientName}%'`);
      const clientRes = await pool.query(`SELECT id, nombres, email FROM clientes WHERE nombres ILIKE $1 LIMIT 10`, [`%${clientName}%`]);
      if (clientRes.rowCount === 0) {
        console.log('No se encontró cliente con ese nombre.');
      } else {
        console.table(clientRes.rows);
        for (const c of clientRes.rows) {
          const filas = await pool.query(`SELECT f.id, f.cliente_id, f.producto_id, p.nombre AS producto, f.creado_en
            FROM favoritos f
            LEFT JOIN productos p ON p.id = f.producto_id
            WHERE f.cliente_id = $1
            ORDER BY f.creado_en DESC`, [c.id]);
          console.log(`Favoritos para cliente ${c.id} - ${c.nombres}:`);
          console.table(filas.rows);
        }
      }
    }

    if (doDedupe) {
      console.log('-- Dedupe MODE enabled: creating backup and deleting duplicates --');
      await pool.query('BEGIN');
      // Create backup table if not exists
      await pool.query('CREATE TABLE IF NOT EXISTS favoritos_backup AS TABLE favoritos WITH NO DATA');
      await pool.query("INSERT INTO favoritos_backup SELECT * FROM favoritos WHERE id NOT IN (SELECT id FROM favoritos_backup);");

      const delSql = `WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY cliente_id, producto_id ORDER BY creado_en DESC, id DESC) AS rn
        FROM favoritos
      )
      DELETE FROM favoritos WHERE id IN (SELECT id FROM ranked WHERE rn > 1)`;

      const delRes = await pool.query(delSql);
      console.log('Deleted duplicates (command executed).');
      await pool.query('COMMIT');

      const totalAfter = await pool.query('SELECT count(*)::int AS total FROM favoritos');
      console.log('Total after dedupe:', totalAfter.rows[0].total);
    }

    await pool.end();
    console.log('Hecho.');
  } catch (err) {
    console.error('Error:', err);
    try { await pool.query('ROLLBACK'); } catch (e) {}
    await pool.end();
    process.exit(1);
  }
})();
