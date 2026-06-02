import pool from "../config/database.js";
import { authMiddleware } from "../auth/authMiddleware.js";

export async function createPedido(req, res) {
  const clienteId = req.cliente?.id;

  if (!clienteId) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const {
    items,
    metodo_pago,
    direccion_entrega,
    telefono,
    referencia
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items vacíos" });
  }

  if (!metodo_pago || !direccion_entrega || !telefono) {
    return res.status(400).json({
      error: "metodo_pago, direccion_entrega y telefono son obligatorios"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const pedidoRes = await client.query(
      `INSERT INTO pedidos (
        cliente_id,
        estado,
        total,
        metodo_pago,
        direccion_entrega,
        telefono,
        referencia
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        clienteId,
        "pendiente",
        0,
        metodo_pago,
        direccion_entrega,
        telefono,
        referencia || null
      ]
    );

    const pedido = pedidoRes.rows[0];
    let total = 0;

    for (const it of items) {
      const productoId = Number(it.producto_id);
      const cantidad = Number(it.cantidad);

      if (!productoId || Number.isNaN(cantidad) || cantidad <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Item inválido" });
      }

      const prodRes = await client.query(
        `SELECT id, nombre, precio, stock
         FROM productos
         WHERE id = $1
         FOR UPDATE`,
        [productoId]
      );

      if (prodRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: `Producto ${productoId} no encontrado`
        });
      }

      const producto = prodRes.rows[0];
      const stock = Number(producto.stock || 0);

      if (stock < cantidad) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: `Stock insuficiente para el producto ${producto.nombre}`
        });
      }

      const precioUnitario = Number(producto.precio || 0);
      const subtotal = Number((precioUnitario * cantidad).toFixed(2));
      total += subtotal;

      await client.query(
        `INSERT INTO pedido_items (
          pedido_id,
          producto_id,
          cantidad,
          precio_unitario,
          subtotal
        )
        VALUES ($1, $2, $3, $4, $5)`,
        [pedido.id, productoId, cantidad, precioUnitario, subtotal]
      );

      await client.query(
        `UPDATE productos
         SET stock = stock - $1
         WHERE id = $2`,
        [cantidad, productoId]
      );
    }

    total = Number(total.toFixed(2));

    await client.query(
      `UPDATE pedidos
       SET total = $1
       WHERE id = $2`,
      [total, pedido.id]
    );

    await client.query("COMMIT");

    const pedidoFull = await pool.query(
      `SELECT *
       FROM pedidos
       WHERE id = $1`,
      [pedido.id]
    );

    const itemsRes = await pool.query(
      `SELECT pi.*, p.nombre, p.imagen_url
       FROM pedido_items pi
       LEFT JOIN productos p ON p.id = pi.producto_id
       WHERE pi.pedido_id = $1`,
      [pedido.id]
    );

    return res.status(201).json({
      pedido: pedidoFull.rows[0],
      items: itemsRes.rows
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("createPedido error:", err);
    return res.status(500).json({ error: "Error creando pedido" });
  } finally {
    client.release();
  }
}

export async function listarPedidos(req, res) {
  const clienteId = req.cliente?.id;

  if (!clienteId) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const pedidosRes = await pool.query(
      `SELECT *
       FROM pedidos
       WHERE cliente_id = $1
       ORDER BY creado_en DESC`,
      [clienteId]
    );

    const pedidos = [];

    for (const pedido of pedidosRes.rows) {
      const itemsRes = await pool.query(
        `SELECT pi.*, p.nombre, p.imagen_url
         FROM pedido_items pi
         LEFT JOIN productos p ON p.id = pi.producto_id
         WHERE pi.pedido_id = $1`,
        [pedido.id]
      );

      pedidos.push({
        pedido,
        items: itemsRes.rows
      });
    }

    return res.json(pedidos);
  } catch (err) {
    console.error("listarPedidos error:", err);
    return res.status(500).json({ error: "Error listando pedidos" });
  }
}

export async function listarPedidosAdmin(req, res) {
  try {
    const pedidosRes = await pool.query(
      `SELECT
        p.id,
        p.cliente_id,
        p.total,
        p.estado,
        p.metodo_pago,
        p.direccion_entrega,
        p.telefono,
        p.referencia,
        p.creado_en,
        u.nombres,
        u.email
       FROM pedidos p
       LEFT JOIN usuarios u ON u.id = p.cliente_id
       ORDER BY p.creado_en DESC`
    );

    const pedidos = [];

    for (const pedido of pedidosRes.rows) {
      const itemsRes = await pool.query(
        `SELECT
          pi.*,
          pr.nombre,
          pr.imagen_url
         FROM pedido_items pi
         LEFT JOIN productos pr ON pr.id = pi.producto_id
         WHERE pi.pedido_id = $1`,
        [pedido.id]
      );

      pedidos.push({
        pedido,
        items: itemsRes.rows
      });
    }

    return res.json(pedidos);
  } catch (err) {
    console.error("listarPedidosAdmin error:", err);
    return res.status(500).json({ error: "Error listando pedidos del admin" });
  }
}

export async function actualizarEstadoPedido(req, res) {
  const { id } = req.params;
  const { estado } = req.body;

  const estadosValidos = [
    "pendiente",
    "pagado",
    "procesando",
    "enviado",
    "entregado",
    "cancelado"
  ];

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: "Estado inválido" });
  }

  try {
    const result = await pool.query(
      `UPDATE pedidos
       SET estado = $1
       WHERE id = $2
       RETURNING *`,
      [estado, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("actualizarEstadoPedido:", err);
    return res.status(500).json({ error: "Error actualizando estado" });
  }
}

export const actualizarEstadoPedidoAdmin = actualizarEstadoPedido;
export const requireAuth = authMiddleware;