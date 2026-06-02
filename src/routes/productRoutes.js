import { Router } from 'express';
import ProductService from '../services/ProductService.js';

export function createProductRouter(productService = new ProductService()) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const products = await productService.getAll();
      return res.json(products);
    } catch (error) {
      console.error('getAll products error:', error);
      return res.status(500).json({ message: 'Error obteniendo productos' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const product = await productService.getById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }

      return res.json(product);
    } catch (error) {
      console.error('getById products error:', error);
      return res.status(500).json({ message: 'Error obteniendo producto' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const created = await productService.saveProduct(req.body);
      return res.status(201).json(created);
    } catch (error) {
      console.error('saveProduct error:', error);
      return res.status(500).json({ message: 'Error creando producto' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const deleted = await productService.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }

      return res.json({ success: true, deleted });
    } catch (error) {
      console.error('deleteProduct error:', error);
      return res.status(500).json({ message: 'Error eliminando producto' });
    }
  });

  return router;
}

export default createProductRouter;