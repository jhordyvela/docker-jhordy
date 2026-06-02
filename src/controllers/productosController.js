import pool from "../config/database.js";
import { uploadToGCS } from "../util/storage.js";

export const getProductos = async (req, res) => {
  try {
    const rawCat = req.query.cat ?? null;
    const cat = rawCat ? decodeURIComponent(String(rawCat)).toLowerCase() : null;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;
    const offset = (page - 1) * limit;

    let whereSql = "";
    const whereParams = [];

    if (cat) {
      whereSql = `WHERE LOWER(c.slug) = $1`;
      whereParams.push(cat);
    }

    const totalQuery = `
      SELECT COUNT(*)::int AS total
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ${whereSql}
    `;

    const totalResult = await pool.query(totalQuery, whereParams);
    const total = totalResult.rows[0]?.total || 0;

    const dataQuery = `
      SELECT
        p.*,
        c.id AS categoria_id,
        c.nombre AS categoria_nombre,
        c.slug AS categoria_slug
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ${whereSql}
      ORDER BY p.id DESC
      LIMIT $${whereParams.length + 1}
      OFFSET $${whereParams.length + 2}
    `;

    const dataParams = [...whereParams, limit, offset];
    const result = await pool.query(dataQuery, dataParams);

    return res.json({
      data: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("getProductos error:", err);
    return res.status(500).json({ error: "Error paginando productos" });
  }
};

export const listarProductos = async (req, res) => {
  try {
    const rawCat = (req.query && (req.query.cat ?? req.query.category ?? req.query.categoria)) || null;
    const cat = rawCat !== null ? decodeURIComponent(String(rawCat)) : null;

    const emptySentinels = new Set(['', 'null', 'undefined', '-']);
    if (rawCat !== null && emptySentinels.has(String(cat).trim())) {
      return res.json([]);
    }

    let sql = `
      SELECT p.*, c.id AS categoria_id, c.nombre AS categoria_nombre, c.slug AS categoria_slug
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
    `;
    const params = [];
    if (cat) {
      if (/^\d+$/.test(String(cat))) {
        sql += ` WHERE p.categoria_id = $1`;
        params.push(Number(cat));
      } else {
        sql += ` WHERE lower(c.slug) = $1 OR lower(c.nombre) = $1`;
        params.push(String(cat).toLowerCase());
      }
    }

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar productos:', error);
    res.status(500).json({ error: 'Error al listar productos' });
  }
};

export const getProducto = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.id AS categoria_id, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = $1
    `, [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

export const createProducto = async (req, res) => {
  try {
  const { nombre, descripcion, precio, categoria_id } = req.body;

    // Validaciones básicas
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    const precioNum = Number(precio);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      return res.status(400).json({ message: "Precio inválido" });
    }

    let categoriaId = null;
    if (categoria_id !== undefined && categoria_id !== null && `${categoria_id}`.trim() !== "") {
      categoriaId = Number(categoria_id);
      if (Number.isNaN(categoriaId)) {
        return res.status(400).json({ message: "categoria_id inválido" });
      }

      // (Opcional pero recomendado) verificar que la categoría exista
      const cat = await pool.query("SELECT id FROM categorias WHERE id = $1", [categoriaId]);
      if (cat.rowCount === 0) {
        return res.status(400).json({ message: "La categoría no existe" });
      }
    }

    // Imagen (opcional) - aceptar req.file o req.files[0]
    let imagen_url = null;
    const file = req.file || (req.files && req.files[0]);
    if (file) {
      const dest = `productos/${Date.now()}-${file.originalname}`;
      try {
        imagen_url = await uploadToGCS(file, dest);
      } catch (err) {
        console.error('Error subiendo a GCS:', err);
        return res.status(500).json({ message: 'Error subiendo imagen' });
      }
    }

    // aceptar stock o cantidad (compatibilidad con distintos clientes)
    const stockRaw = req.body.stock ?? req.body.cantidad ?? 0;
    const stockNum = Number(stockRaw) || 0;

    const { rows } = await pool.query(
      `INSERT INTO productos (nombre, descripcion, precio, imagen_url, categoria_id, stock)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, descripcion, precio, imagen_url, categoria_id, stock`,
      [
        nombre.trim(),
        descripcion ?? null,
        precioNum,
        imagen_url,
        categoriaId,
        stockNum,
      ]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error("crearProducto error:", error);
    return res.status(500).json({ message: "Error creando producto" });
  }
};

export const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, categoria_id } = req.body;

    // aceptar req.file o req.files[0]
    let imagen_url = req.body.imagen_url || null;
    const file = req.file || (req.files && req.files[0]);
    if (file) {
      const dest = `productos/${Date.now()}-${file.originalname}`;
      try {
        imagen_url = await uploadToGCS(file, dest);
      } catch (err) {
        console.error('Error subiendo a GCS:', err);
        return res.status(500).json({ message: 'Error subiendo imagen' });
      }
    }

    // aceptar stock o cantidad (compatibilidad)
    const stockRaw = req.body.stock ?? req.body.cantidad;
    const stockNum = (typeof stockRaw !== 'undefined') ? (Number(stockRaw) || 0) : null;

    const { rows } = await pool.query(
      `UPDATE productos SET nombre=$1, descripcion=$2, precio=$3, stock=COALESCE($4, stock), categoria_id=$5, imagen_url=COALESCE($6, imagen_url) WHERE id=$7 RETURNING *`,
      [nombre, descripcion || null, precio || 0, stockNum, categoria_id || null, imagen_url, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Producto no encontrado' });
    return res.json(rows[0]);
  } catch (error) {
    console.error('updateProducto error:', error);
    return res.status(500).json({ message: 'Error actualizando producto' });
  }
};

export const deleteProducto = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM productos WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar el producto', error);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
};

