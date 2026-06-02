import pool from '../config/database.js';

// 🔹 Obtener imágenes por producto
export const getImagenesByProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, url, orden FROM imagenes_producto WHERE producto_id = $1 ORDER BY orden ASC',
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener imágenes' });
  }
};

// 🔹 Crear imagen
export const createImagen = async (req, res) => {
  try {
    const { producto_id, url, orden } = req.body;

    const result = await pool.query(
      `INSERT INTO imagenes_producto (producto_id, url, orden)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [producto_id, url, orden || 1]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear imagen' });
  }
};

// 🔹 Eliminar imagen
export const deleteImagen = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'DELETE FROM imagenes_producto WHERE id = $1',
      [id]
    );

    res.json({ message: 'Imagen eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar imagen' });
  }
};