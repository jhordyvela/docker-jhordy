import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { createProductRouter } from '../../src/routes/productRoutes.js';
import { InMemoryProductService } from './inMemoryProductService.js';

export function createTestApp(initialProducts = []) {
  const productService = new InMemoryProductService(initialProducts);
  const app = express();

  app.use(morgan('dev'));
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/products', createProductRouter(productService));

  return { app, productService };
}