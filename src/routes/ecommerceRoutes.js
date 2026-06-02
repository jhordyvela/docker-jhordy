import express from "express";
import multer from "multer";
import { createCategoria, deleteCategoria, getCategoria, getCategorias, getCategoriasConConteo, updateCategoria, listarCategoriasConTotales } from "../controllers/categoriasController.js";
import { getProductos, listarProductos, getProducto, createProducto, updateProducto, deleteProducto } from "../controllers/productosController.js";
import { registrar, login, getPerfil, actualizarPerfil } from "../controllers/authController.js";
import { authMiddleware, requireAdmin } from "../auth/authMiddleware.js";
import { createPedido, listarPedidos, listarPedidosAdmin, actualizarEstadoPedido } from "../controllers/pedidosController.js";
import { listarFavoritos, addFavorito, removeFavorito, listarFavoritosAdmin, listarFavoritosResumenPorUsuario, insertFavoritoDebug } from "../controllers/favoritosController.js";
import { listarUsuarios, registerUsuario, loginUsuario, crearUsuarioAdmin, actualizarUsuario, eliminarUsuario } from "../controllers/usuariosController.js";
import {
  getInicio,
  actualizarHero,
  actualizarBanner
} from "../controllers/inicioController.js";
import {
  getImagenesByProducto,
  createImagen,
  deleteImagen
} from '../controllers/imagenesController.js';

const router = express.Router();

// Usar memoryStorage para subir a GCS desde buffer
const upload = multer({ storage: multer.memoryStorage() });
router.get("/productos", getProductos);
router.get("/productos/listar", listarProductos);

router.get("/productos/:id", getProducto);

router.post("/productos", authMiddleware, requireAdmin, upload.any(), createProducto);


router.put("/productos/:id", authMiddleware, requireAdmin, upload.any(), updateProducto);

router.delete("/productos/:id", authMiddleware, requireAdmin, deleteProducto);

router.get("/inicio", getInicio);

router.put("/admin/inicio/hero", authMiddleware, requireAdmin, actualizarHero);
router.put("/admin/inicio/banner", authMiddleware, requireAdmin, actualizarBanner);


router.get("/categorias", getCategorias);
router.post("/categorias", authMiddleware, requireAdmin, express.json(), createCategoria);
router.get("/categorias/conteo", getCategoriasConConteo);
router.get("/categorias/totales", listarCategoriasConTotales);
router.get("/categorias/:id", getCategoria);
router.put("/categorias/:id", authMiddleware, requireAdmin, express.json(), updateCategoria);
router.delete("/categorias/:id", authMiddleware, requireAdmin, deleteCategoria);


router.post("/clientes/register", express.json(), registerUsuario);

router.post("/clientes/login", express.json(), loginUsuario);

router.post("/auth/registro", registrar);

router.post("/auth/login", login);


router.get("/auth/perfil", authMiddleware, getPerfil);
router.put("/auth/perfil", authMiddleware, upload.single('foto'), actualizarPerfil);


// Pedidos (protegidos)
router.post('/pedidos', authMiddleware, express.json(), createPedido);
router.get('/pedidos', authMiddleware, listarPedidos);
router.get('/admin/pedidos', authMiddleware, requireAdmin, listarPedidosAdmin);
router.put('/admin/pedidos/:id/estado', authMiddleware, requireAdmin, express.json(), actualizarEstadoPedido);

// Favoritos (protegidos) — el cliente logueado puede agregar, listar y quitar favoritos
router.get('/favoritos', authMiddleware, listarFavoritos);
router.post('/favoritos', authMiddleware, express.json(), addFavorito);
router.delete('/favoritos/:producto_id', authMiddleware, removeFavorito);

// Debug route: insertar favorito para usuario autenticado (solo dev)
router.post('/debug/favoritos/:producto_id/insert', authMiddleware, insertFavoritoDebug);

// Admin: vistas globales (solo admin)
router.get('/admin/favoritos', authMiddleware, requireAdmin, listarFavoritosAdmin);
router.get('/admin/favoritos/resumen', authMiddleware, requireAdmin, listarFavoritosResumenPorUsuario);
router.get('/admin/clientes', authMiddleware, requireAdmin, listarUsuarios);

// Admin: CRUD clientes
router.post('/admin/clientes', authMiddleware, requireAdmin, express.json(), crearUsuarioAdmin);
router.put('/admin/clientes/:id', authMiddleware, requireAdmin, express.json(), actualizarUsuario);
router.delete('/admin/clientes/:id', authMiddleware, requireAdmin, eliminarUsuario);

router.get('/imagenes/producto/:id', getImagenesByProducto);
router.post('/imagenes', createImagen);
router.delete('/imagenes/:id', deleteImagen);


export default router;
