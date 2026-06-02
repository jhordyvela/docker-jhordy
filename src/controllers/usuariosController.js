import pool from "../config/database.js";
import { ROLE_CLIENT, ROLE_ADMIN } from "../config/roles.js";
import bcrypt from "bcryptjs";
import { signToken } from "../util/jwt.js";
import { requireAuth } from "../auth/authMiddleware.js";
import { validarTelefonoInput } from "../util/telefono.js";

export async function registerUsuario(req, res) {
  try {
    const { nombres, email, telefono, password } = req.body;
    if (!nombres || !email || !password) return res.status(400).json({ error: "Faltan datos" });

    const telefonoVal = validarTelefonoInput(telefono);
    if (!telefonoVal.valid) {
      return res.status(400).json({
        error: "Telefono invalido",
        advertencia: telefonoVal.warning,
      });
    }

    const exists = await pool.query("SELECT id FROM usuarios  WHERE email=$1", [email]);
    if (exists.rowCount) return res.status(409).json({ error: "Email ya registrado" });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nombres, email, telefono, password_hash, role)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, nombres, email, telefono, foto_url, creado_en, actualizado_en, role`,
      [nombres, email, telefonoVal.value ?? null, hash, ROLE_CLIENT]
    );

    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function loginUsuario(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Faltan datos" });

    // Permitir login usando correo o teléfono (campo 'email' puede contener teléfono)
    // Incluir role en la misma consulta para evitar una segunda consulta
    const result = await pool.query("SELECT id, nombres, email, telefono, foto_url, password_hash, role FROM usuarios WHERE email=$1 OR telefono=$1", [email]);
    if (!result.rowCount) return res.status(401).json({ error: "Credenciales inválidas" });

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    // role ya viene en la fila
    const role = user.role || ROLE_CLIENT;
    const token = signToken({ id: user.id, role });

    return res.json({ token, user: { id: user.id, nombres: user.nombres, email: user.email, telefono: user.telefono, foto_url: user.foto_url, role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno" });
  }
}
export const authMiddleware = requireAuth;

// Admin: listar usuarios
export const listarUsuarios = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombres, email, telefono, foto_url, creado_en, actualizado_en
       FROM usuarios 
       WHERE role = $1
       ORDER BY creado_en DESC`,
      [ROLE_CLIENT]
    );
    return res.json(rows);
  } catch (err) {
    console.error('listarUsuarios error:', err);
    return res.status(500).json({ error: 'Error listando usuarios' });
  }
};

// Admin: crear usuario (puede usarse para crear desde panel)
export const crearUsuarioAdmin = async (req, res) => {
  try {
    const { nombres, email, telefono, password, role } = req.body;
    if (!nombres || !email || !password) return res.status(400).json({ error: 'Faltan datos' });

    const telefonoVal = validarTelefonoInput(telefono);
    if (!telefonoVal.valid) {
      return res.status(400).json({
        error: "Telefono invalido",
        advertencia: telefonoVal.warning,
      });
    }

    const exists = await pool.query('SELECT id FROM usuarios WHERE email=$1', [email]);
    if (exists.rowCount) return res.status(409).json({ error: 'Email ya registrado' });

    const hash = await bcrypt.hash(password, 10);
    // allow admin to create another admin if explicit role is provided and caller is admin
    const finalRole = role === ROLE_ADMIN ? ROLE_ADMIN : ROLE_CLIENT;
    const result = await pool.query(
      `INSERT INTO usuarios (nombres, email, telefono, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, nombres, email, telefono, foto_url, creado_en, actualizado_en, role`,
      [nombres, email, telefonoVal.value ?? null, hash, finalRole]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('crearUsuarioAdmin error:', err);
    return res.status(500).json({ error: 'Error creando usuario' });
  }
};

// Admin: actualizar usuario
export const actualizarUsuario = async (req, res) => {
  try {
    const id = req.params.id;
    const { nombres, email, telefono, password } = req.body;
    if (!id) return res.status(400).json({ error: 'id requerido' });

    const telefonoVal = validarTelefonoInput(telefono);
    if (!telefonoVal.valid) {
      return res.status(400).json({
        error: "Telefono invalido",
        advertencia: telefonoVal.warning,
      });
    }

    // check exists
    const exists = await pool.query('SELECT id FROM usuarios WHERE id=$1', [id]);
    if (!exists.rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });

    let password_hash = null;
    if (password) password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `UPDATE usuarios SET nombres = COALESCE($1, nombres), email = COALESCE($2, email), telefono = COALESCE($3, telefono), password_hash = COALESCE($4, password_hash), actualizado_en = NOW() WHERE id = $5 RETURNING id, nombres, email, telefono, foto_url, creado_en, actualizado_en`,
      [nombres || null, email || null, telefonoVal.provided ? (telefonoVal.value ?? null) : null, password_hash, id]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('actualizarUsuario error:', err);
    return res.status(500).json({ error: 'Error actualizando usuario' });
  }
};

// Admin: eliminar usuario
export const eliminarUsuario = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id requerido' });

    const result = await pool.query('DELETE FROM usuarios WHERE id=$1 RETURNING id', [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json({ success: true });
  } catch (err) {
    console.error('eliminarUsuario error:', err);
    return res.status(500).json({ error: 'Error eliminando usuario' });
  }
};
