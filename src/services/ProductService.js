import pool from '../config/database.js';

export default class ProductService {
  constructor(db = pool) {
    this.db = db;
  }

  async getAll() {
    const { rows } = await this.db.query(`
      SELECT
        p.*,
        c.id AS categoria_id,
        c.nombre AS categoria_nombre,
        c.slug AS categoria_slug
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ORDER BY p.id DESC
    `);

    return rows;
  }

  async getById(id) {
    const { rows } = await this.db.query(
      `
      SELECT
        p.*,
        c.id AS categoria_id,
        c.nombre AS categoria_nombre,
        c.slug AS categoria_slug
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = $1
    `,
      [id]
    );

    return rows[0] ?? null;
  }

  async saveProduct(product) {
    const payload = product ?? {};
    const nombre = typeof payload.nombre === 'string' ? payload.nombre.trim() : '';
    const descripcion = payload.descripcion ?? null;
    const precio = Number(payload.precio);
    const imagenUrl = payload.imagen_url ?? null;
    const categoriaId = payload.categoria_id ?? null;
    const stock = Number(payload.stock ?? payload.cantidad ?? 0) || 0;

    const { rows } = await this.db.query(
      `
      INSERT INTO productos (nombre, descripcion, precio, imagen_url, categoria_id, stock)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nombre, descripcion, precio, imagen_url, categoria_id, stock
    `,
      [nombre, descripcion, precio, imagenUrl, categoriaId, stock]
    );

    return rows[0];
  }

  async deleteProduct(id) {
    const { rows } = await this.db.query(
      'DELETE FROM productos WHERE id = $1 RETURNING id, nombre, descripcion, precio, imagen_url, categoria_id, stock',
      [id]
    );

    return rows[0] ?? null;
  }
}