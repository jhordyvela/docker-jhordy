import 'dotenv/config';
import { conectar } from "./config/database.js";
import createApp from './app.js';

const app = createApp();


async function startServer() {
  try {
    await conectar();
    const PORT = process.env.PORT || 3000; // ✅ Render
    app.listen(PORT, () => console.log("Servidor corriendo en el puerto", PORT));
  } catch (error) {
    console.error("Error al iniciar servidor:", error);
    process.exit(1);
  }
}

startServer();

export default app;