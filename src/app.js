import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import swaggerSpec from './config/swagger.js';
import ecommerceRoutes from './routes/ecommerceRoutes.js';
import { createProductRouter } from './routes/productRoutes.js';

export function createApp({ productService } = {}) {
  const app = express();

  // 🔥 Middlewares base
  app.use(morgan('dev'));
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 🏠 Ruta principal
  app.get('/', (req, res) => {
    res.send('API Ecommerce - Servidor Funcionando');
  });

  // 📚 Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // 📦 API productos (modular)
  app.use('/api/products', createProductRouter(productService));

  // 🌐 API general (categorías, auth, pedidos, etc)
  app.use('/api', ecommerceRoutes);

  // 🚀 SERVIR HTML (ESTO ES LO NUEVO)
  app.use(express.static('public'));

  return app;
}

export default createApp;