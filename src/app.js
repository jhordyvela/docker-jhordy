import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import path from 'path'; // 👈 1. Importa 'path'
import { fileURLToPath } from 'url'; // 👈 2. Importa esto (necesario en ES Modules)

import swaggerSpec from './config/swagger.js';
import ecommerceRoutes from './routes/ecommerceRoutes.js';
import { createProductRouter } from './routes/productRoutes.js';

// 3. Configura __dirname para ES Modules (ya que usas "import")
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // 🚀 SERVIR HTML CORREGIDO 
  // Esto mapea la carpeta 'src/auth' a la ruta raíz '/' de los estáticos
  app.use(express.static(path.join(__dirname, 'auth')));

  return app;
}

export default createApp;