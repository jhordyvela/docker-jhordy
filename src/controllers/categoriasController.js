import pool from "../config/database.js";

function makeSlug(texto = '') {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export const getCategorias = async (req, res) => {
  try {
    const includeCounts = req.query && (req.query.includeCounts === 'true' || req.query.includeCounts === '1');
    if (includeCounts) {
      const { rows } = await pool.query(`
        SELECT
          c.id, c.nombre, c.slug, c.descripcion,
          COUNT(p.id)::int AS total
        FROM categorias c
        LEFT JOIN productos p ON p.categoria_id = c.id
        GROUP BY c.id, c.nombre, c.slug, c.descripcion
        ORDER BY c.nombre
      `);
      return res.json(rows);
    }

    const result = await pool.query('SELECT * FROM categorias ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener categorias:', error);
    res.status(500).json({ error: 'Error al obtener categorias' });
  }
};

export const getCategoria = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Categoria no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener categoria:', error);
    res.status(500).json({ error: 'Error al obtener categoria' });
  }
};



export const createCategoria = async (req, res) => {
  try {
    const { nombre, slug, descripcion } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const slugBase = makeSlug(slug || nombre);
    if (!slugBase) {
      return res.status(400).json({ message: 'Slug inválido' });
    }

    // asegurar unicidad del slug
    const check = await pool.query('SELECT id FROM categorias WHERE slug = $1', [slugBase]);
    let finalSlug = slugBase;
    if (check.rowCount > 0) {
      let i = 2;
      while (true) {
        const candidate = `${slugBase}-${i}`;
        const exists = await pool.query('SELECT id FROM categorias WHERE slug = $1', [candidate]);
        if (exists.rowCount === 0) {
          finalSlug = candidate;
          break;
        }
        i++;
      }
    }

    const result = await pool.query(
      `INSERT INTO categorias (nombre, slug, descripcion) VALUES ($1, $2, $3) RETURNING *`,
      [nombre.trim(), finalSlug, descripcion ?? null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createCategoria error', err);
    if (err.code === '23505') return res.status(400).json({ error: 'Ya existe una categoria con ese nombre o slug' });
    return res.status(500).json({ message: 'Error creando categoría' });
  }
};

export const updateCategoria = async (req, res) => {
  try {
    const { nombre, slug, descripcion } = req.body;
    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const slugBase = makeSlug(slug || nombre);
    if (!slugBase) {
      return res.status(400).json({ message: 'Slug inválido' });
    }

    const existing = await pool.query('SELECT id FROM categorias WHERE slug = $1 AND id <> $2', [slugBase, req.params.id]);
    let finalSlug = slugBase;
    if (existing.rowCount > 0) {
      let i = 2;
      while (true) {
        const candidate = `${slugBase}-${i}`;
        const exists = await pool.query('SELECT id FROM categorias WHERE slug = $1 AND id <> $2', [candidate, req.params.id]);
        if (exists.rowCount === 0) {
          finalSlug = candidate;
          break;
        }
        i++;
      }
    }

    const result = await pool.query(
      'UPDATE categorias SET nombre = $1, slug = $2, descripcion = $3 WHERE id = $4 RETURNING *',
      [String(nombre).trim(), finalSlug, descripcion || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Categoria no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar categoria:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'Ya existe una categoria con ese nombre' });
    res.status(500).json({ error: 'Error al actualizar categoria' });
  }
};

export const deleteCategoria = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM categorias WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Categoria no encontrada' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar categoria:', error);
    res.status(500).json({ error: 'Error al eliminar categoria' });
  }
};

export const listarCategoriasConTotales = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.id, c.nombre, c.slug, c.descripcion,
        COUNT(p.id)::int AS total
      FROM categorias c
      LEFT JOIN productos p ON p.categoria_id = c.id
      GROUP BY c.id, c.nombre, c.slug, c.descripcion
      ORDER BY c.nombre
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar categorías' });
  }
};

export const getCategoriasConConteo = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.id,
        c.nombre,
        c.slug,
        COUNT(p.id)::int AS total_productos
      FROM categorias c
      LEFT JOIN productos p ON p.categoria_id = c.id
      GROUP BY c.id, c.nombre, c.slug
      ORDER BY c.nombre ASC
    `);

    return res.json(rows);
  } catch (error) {
    console.error("getCategoriasConConteo error:", error);
    return res.status(500).json({ error: "Error obteniendo categorías" });
  }
};
