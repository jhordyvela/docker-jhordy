import pool from "../config/database.js";
import { ROLE_CLIENT } from "../config/roles.js";

let favoritosUserColumnCache = null;

async function getFavoritosUserColumn() {
  if (favoritosUserColumnCache) return favoritosUserColumnCache;

  const { rows } = await pool.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'favoritos'
        AND column_name IN ('usuario_id', 'cliente_id')`
  );

  const cols = new Set(rows.map((r) => r.column_name));
  favoritosUserColumnCache = cols.has('usuario_id') ? 'usuario_id' : 'cliente_id';
  return favoritosUserColumnCache;
}

export const listarFavoritos = async (req, res) => {
  try {
    console.debug('listarFavoritos: req.cliente=', req.cliente);
    const usuarioId = req.cliente && req.cliente.id;
    const role = req.cliente && (req.cliente.role || req.cliente.rol);
    // Si no hay usuario en request -> no autorizado
    if (!usuarioId) {
      console.warn('listarFavoritos: no usuario en request');
      return res.status(401).json({ error: 'No autorizado' });
    }
    // Sólo clientes pueden listar sus favoritos. Si el token pertenece a admin u otro rol,
    // devolvemos 403 para que el frontend no sobrescriba la lista local con un array vacío.
    if (role !== ROLE_CLIENT) {
      console.warn('listarFavoritos: role no cliente, devolviendo 403 para role=', role);
      return res.status(403).json({ error: 'Solo clientes pueden ver sus favoritos' });
    }

    // Devolver información del producto en una forma más compatible con el frontend
    // Retornamos `id` (producto_id), nombre, imagen, precio y descripción
    const userCol = await getFavoritosUserColumn();
    const { rows } = await pool.query(
      `SELECT f.producto_id AS id, p.nombre, p.imagen_url, p.precio, p.descripcion
       FROM favoritos f
       JOIN productos p ON p.id = f.producto_id
       WHERE f.${userCol} = $1
       ORDER BY f.creado_en DESC`,
      [usuarioId]
    );

    return res.json(rows);
  } catch (err) {
    console.error('listarFavoritos error:', err);
    return res.status(500).json({ error: 'Error listando favoritos' });
  }
};

export const addFavorito = async (req, res) => {
  try {
    const usuarioId = req.cliente && req.cliente.id;
    console.debug('addFavorito: req.cliente=', req.cliente);
    if (!usuarioId) {
      console.warn('addFavorito: no usuario en request');
      return res.status(401).json({ error: 'No autorizado' });
    }

    const productoId = req.body.producto_id ?? req.body.id ?? req.body.productId ?? req.body.productoId;
    console.debug('addFavorito: productoId=', productoId, 'body=', req.body);
    if (!productoId) {
      console.warn('addFavorito: producto_id no recibido en body');
      return res.status(400).json({ error: 'producto_id requerido' });
    }

    // Sólo clientes (no admin) pueden marcar favoritos
    const role = req.cliente && (req.cliente.role || req.cliente.rol);
    if (role !== ROLE_CLIENT) {
      console.warn('addFavorito: role no permitido=', role);
      return res.status(403).json({ error: 'Solo clientes pueden agregar favoritos' });
    }

    // Verificar que el producto exista
    const p = await pool.query('SELECT id FROM productos WHERE id = $1', [productoId]);
    if (p.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    // Insertar evitando duplicados
    const userCol = await getFavoritosUserColumn();
    const { rows } = await pool.query(
      `INSERT INTO favoritos (${userCol}, producto_id) VALUES ($1, $2)
       ON CONFLICT (${userCol}, producto_id) DO NOTHING RETURNING *`,
      [usuarioId, productoId]
    );

    console.debug('addFavorito: insert result rows=', rows);
    if (rows.length === 0) return res.status(200).json({ message: 'Ya estaba en favoritos' });
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('addFavorito error:', err);
    return res.status(500).json({ error: 'Error agregando favorito' });
  }
};

export const removeFavorito = async (req, res) => {
  try {
    const usuarioId = req.cliente && req.cliente.id;
    console.debug('removeFavorito: req.cliente=', req.cliente);
    if (!usuarioId) {
      console.warn('removeFavorito: no usuario en request');
      return res.status(401).json({ error: 'No autorizado' });
    }

    const productoId = req.params.producto_id ?? req.body.producto_id ?? req.body.id ?? req.body.productId;
    console.debug('removeFavorito: productoId=', productoId, 'params=', req.params, 'body=', req.body);
    if (!productoId) {
      console.warn('removeFavorito: producto_id no recibido');
      return res.status(400).json({ error: 'producto_id requerido' });
    }

    // Sólo clientes pueden eliminar sus favoritos
    const role = req.cliente && (req.cliente.role || req.cliente.rol);
    if (role !== ROLE_CLIENT) {
      console.warn('removeFavorito: role no permitido=', role);
      return res.status(403).json({ error: 'Solo clientes pueden eliminar favoritos' });
    }

    const userCol = await getFavoritosUserColumn();
    const { rows } = await pool.query(
      `DELETE FROM favoritos WHERE ${userCol} = $1 AND producto_id = $2 RETURNING *`,
      [usuarioId, productoId]
    );

    console.debug('removeFavorito: delete result rows=', rows);

    if (rows.length === 0) return res.status(404).json({ error: 'Favorito no encontrado' });
    return res.json({ success: true });
  } catch (err) {
    console.error('removeFavorito error:', err);
    return res.status(500).json({ error: 'Error removiendo favorito' });
  }
};

// Admin: listar todos los favoritos (lectura global)
export const listarFavoritosAdmin = async (req, res) => {
  try {
   const userCol = await getFavoritosUserColumn();
   // Opcionalmente filtrar por producto_id y usuario_id/cliente_id vía query
   const { usuario_id, cliente_id, producto_id } = req.query || {};
   const userIdFilter = usuario_id ?? cliente_id;
   let sql = `SELECT f.${userCol} AS usuario_id, f.producto_id, p.nombre, p.descripcion, p.precio, p.imagen_url, f.creado_en, u.nombres AS usuario_nombre, u.email AS usuario_email, u.role AS usuario_role
       FROM favoritos f
       JOIN productos p ON p.id = f.producto_id
     JOIN usuarios u ON u.id = f.${userCol}`;
    const params = [];
    const where = [];
   if (userIdFilter) { params.push(userIdFilter); where.push(`f.${userCol} = $${params.length}`); }
    if (producto_id) { params.push(producto_id); where.push(`f.producto_id = $${params.length}`); }
    if (where.length) sql += '\nWHERE ' + where.join(' AND ');
    sql += '\nORDER BY f.creado_en DESC';
    const { rows } = await pool.query(sql, params);

    return res.json(rows);
  } catch (err) {
    console.error('listarFavoritosAdmin error:', err);
    return res.status(500).json({ error: 'Error listando favoritos (admin)' });
  }
};

// Admin: resumen por cliente (total favoritos + fecha último favorito)
export const listarFavoritosResumenPorUsuario = async (req, res) => {
  try {
    // Debug: quién hace la petición
    console.debug('listarFavoritosResumenPorUsuario: req.cliente=', req.cliente);
     const userCol = await getFavoritosUserColumn();
    // First, try the intended query filtering by role
    const qByRole = `SELECT
         u.id AS usuario_id,
         u.nombres,
         u.email,
         u.telefono,
         COUNT(f.id) AS total_favoritos,
         MAX(f.creado_en) AS ultimo_favorito
       FROM favoritos f
       JOIN usuarios u ON u.id = f.${userCol}
       WHERE u.role = $1
       GROUP BY u.id, u.nombres, u.email, u.telefono
       ORDER BY ultimo_favorito DESC`;

    let { rows } = await pool.query(qByRole, [ROLE_CLIENT]);
    if (!rows || rows.length === 0) {
      console.warn('listarFavoritosResumenPorUsuario: no rows for role filter, falling back to summary for all users');
      const qAll = `SELECT
         u.id AS usuario_id,
         u.nombres,
         u.email,
         u.telefono,
         COUNT(f.id) AS total_favoritos,
         MAX(f.creado_en) AS ultimo_favorito
       FROM favoritos f
       JOIN usuarios u ON u.id = f.${userCol}
       GROUP BY u.id, u.nombres, u.email, u.telefono
       ORDER BY ultimo_favorito DESC`;
      const alt = await pool.query(qAll);
      rows = alt.rows || [];
    }

    return res.json(rows);
  } catch (err) {
    console.error('listarFavoritosResumenPorUsuario error:', err);
    return res.status(500).json({ error: 'Error listando resumen de favoritos (admin)' });
  }
};

// Debug: insertar favorito para el usuario autenticado (útil para pruebas)
export const insertFavoritoDebug = async (req, res) => {
  try {
    const usuarioId = req.cliente && req.cliente.id;
    if (!usuarioId) return res.status(401).json({ error: 'No autorizado' });

    const role = req.cliente && (req.cliente.role || req.cliente.rol);
    if (role !== ROLE_CLIENT) {
      console.warn('insertFavoritoDebug: role no permitido=', role);
      return res.status(403).json({ error: 'Solo clientes pueden crear favoritos (debug)'});
    }

    const productoId = Number(req.params.producto_id ?? req.body.producto_id);
    if (!productoId) return res.status(400).json({ error: 'producto_id requerido' });

    // Verificar que el producto exista
    const p = await pool.query('SELECT id FROM productos WHERE id = $1', [productoId]);
    if (p.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const userCol = await getFavoritosUserColumn();
    await pool.query(
      `INSERT INTO favoritos (${userCol}, producto_id) VALUES ($1, $2)
       ON CONFLICT (${userCol}, producto_id) DO NOTHING`,
      [usuarioId, productoId]
    );

    const { rows } = await pool.query(`SELECT * FROM favoritos WHERE ${userCol}=$1 AND producto_id=$2`, [usuarioId, productoId]);
    if (!rows.length) return res.status(500).json({ error: 'No se pudo crear favorito' });
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('insertFavoritoDebug error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
};
