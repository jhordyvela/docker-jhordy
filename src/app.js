import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import swaggerSpec from './config/swagger.js';
import ecommerceRoutes from './routes/ecommerceRoutes.js';
import { createProductRouter } from './routes/productRoutes.js';

export function createApp({ productService } = {}) {
  const app = express();

  app.use(morgan('dev'));
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/', (req, res) => res.send('API Ecommerce - Servidor Funcionando'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api/products', createProductRouter(productService));
  app.use('/api', ecommerceRoutes);

  return app;
}

export default createApp;