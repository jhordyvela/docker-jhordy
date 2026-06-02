#!/usr/bin/env node
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { ROLE_ADMIN } from '../config/roles.js';

function parseArgs(args) {
  // Accept: email password nombres [role]
  const email = args[0] || 'admin@example.com';
  const password = args[1] || 'admin123';
  const nombres = args[2] || 'Administrador';
  // Allow either positional role or --role <value>
  let role = args[3];
  const roleFlagIndex = args.findIndex(a => a === '--role' || a === '-r');
  if (roleFlagIndex !== -1 && args.length > roleFlagIndex + 1) {
    role = args[roleFlagIndex + 1];
  }
  if (!role) role = ROLE_ADMIN;
  return { email, password, nombres, role };
}

async function run() {
  const args = process.argv.slice(2);
  const { email, password, nombres, role } = parseArgs(args);

  try {
    const exists = await pool.query('SELECT id FROM clientes WHERE email=$1', [email]);
    if (exists.rowCount) {
      console.log('Usuario ya existe con ese email.');
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 10);
    const res = await pool.query(
      'INSERT INTO clientes (nombres, email, telefono, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [nombres, email, null, hash, role]
    );

    console.log(`Usuario creado con id ${res.rows[0].id} y rol ${role}`);
    process.exit(0);
  } catch (err) {
    console.error('Error al crear usuario:', err);
    process.exit(1);
  }
}

run();
