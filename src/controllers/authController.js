import pool from "../config/database.js";
import bcrypt from "bcryptjs";
import { signToken } from "../util/jwt.js";
import { ROLE_CLIENT } from "../config/roles.js";
import { uploadToGCS } from "../util/storage.js";
import { validarTelefonoInput } from "../util/telefono.js";

export async function registrar(req, res) {
  const { nombres, email, telefono, password, confirm } = req.body || {};

  if (!nombres || !email || !password || !confirm) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  // 🔥 VALIDACIÓN CLAVE
  if (password !== confirm) {
    return res.status(400).json({ error: "Las contraseñas no coinciden" });
  }

  const telefonoVal = validarTelefonoInput(telefono);
  if (!telefonoVal.valid) {
    return res.status(400).json({
      error: "Telefono invalido",
      advertencia: telefonoVal.warning,
    });
  }

  try {
    const exists = await pool.query("SELECT id FROM usuarios WHERE email=$1", [
      email,
    ]);
    if (exists.rowCount)
      return res.status(409).json({ error: "Email ya registrado" });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nombres, email, telefono, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id,nombres,email,telefono,creado_en,role`,
      [nombres, email, telefonoVal.value ?? null, hash, ROLE_CLIENT],
    );

    const cliente = result.rows[0];
    return res.status(201).json({
      mensaje: "Usuario registrado exitosamente",
      usuario: cliente,
    });
  } catch (err) {
    console.error("auth.registrar error:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Faltan datos" });

    const result = await pool.query(
      "SELECT id, nombres, email, telefono, foto_url, password_hash, role FROM usuarios WHERE email=$1 OR telefono=$1",
      [email]
    );
    if (!result.rowCount) return res.status(401).json({ error: "Credenciales inválidas" });

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const nombre = user.nombres || user.nombre || "";
    const role = user.role || ROLE_CLIENT;

    // IMPORTANTE: incluir role en el token
    const token = signToken({ id: user.id, role });
    

    return res.json({
      mensaje: "Login exitoso",
      token,
      usuario: {
        id: user.id,
        nombre,
        nombres: user.nombres,
        email: user.email,
        telefono: user.telefono,
        foto_url: user.foto_url || null,
        role,
      },
    });
  } catch (err) {
    console.error("auth.login error:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function getPerfil(req, res) {
  try {
    const userId = (req.user && req.user.id) || (req.cliente && req.cliente.id);
    if (!userId) return res.status(401).json({ error: "No autorizado" });

    const { rows } = await pool.query(
      `SELECT id, nombres, email, telefono, foto_url, role
       FROM usuarios
       WHERE id = $1 LIMIT 1`,
      [userId],
    );

    const user = rows[0];
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    return res.json({ user });
  } catch (err) {
    console.error("auth.getPerfil error:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function actualizarPerfil(req, res) {
  try {
    const userId = (req.user && req.user.id) || (req.cliente && req.cliente.id);
    if (!userId) return res.status(401).json({ error: "No autorizado" });

    const {
      nombres,
      telefono,
      password_actual,
      password_nueva,
    } = req.body || {};

    const telefonoVal = validarTelefonoInput(telefono);
    if (!telefonoVal.valid) {
      return res.status(400).json({
        error: "Telefono invalido",
        advertencia: telefonoVal.warning,
      });
    }

    const current = await pool.query(
      "SELECT id, nombres, email, telefono, foto_url, password_hash, role FROM usuarios WHERE id = $1 LIMIT 1",
      [userId],
    );
    if (!current.rowCount) return res.status(404).json({ error: "Usuario no encontrado" });

    const existing = current.rows[0];

    let passwordHash = null;
    if (password_nueva) {
      if (!password_actual) {
        return res.status(400).json({ error: "Debes ingresar tu contraseña actual" });
      }
      const ok = await bcrypt.compare(password_actual, existing.password_hash);
      if (!ok) {
        return res.status(400).json({ error: "La contraseña actual es incorrecta" });
      }
      passwordHash = await bcrypt.hash(password_nueva, 10);
    }

    let fotoUrl = null;
    if (req.file) {
      const dest = `usuarios/${Date.now()}-${req.file.originalname}`;
      fotoUrl = await uploadToGCS(req.file, dest);
    }

    const updates = [];
    const values = [];
    let i = 1;

    if (typeof nombres === "string" && nombres.trim()) {
      updates.push(`nombres = $${i++}`);
      values.push(nombres.trim());
    }
    if (telefonoVal.provided) {
      updates.push(`telefono = $${i++}`);
      values.push(telefonoVal.value ?? null);
    }
    if (passwordHash) {
      updates.push(`password_hash = $${i++}`);
      values.push(passwordHash);
    }
    if (fotoUrl) {
      updates.push(`foto_url = $${i++}`);
      values.push(fotoUrl);
    }

    if (!updates.length) {
      return res.status(400).json({ error: "No hay cambios para actualizar" });
    }

    updates.push("actualizado_en = NOW()");
    values.push(userId);

    const result = await pool.query(
      `UPDATE usuarios SET ${updates.join(", ")} WHERE id = $${i} RETURNING id, nombres, email, telefono, foto_url, role`,
      values,
    );

    return res.json({
      message: "Perfil actualizado correctamente",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("auth.actualizarPerfil error:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}
