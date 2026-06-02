# Guía rápida: panel admin, migración y frontend (Astro)

Este repo contiene el backend (Node/Express) y ejemplos para un panel admin simple en Astro. Este README explica pasos profesionales para:

- Añadir columna `role` en la tabla `clientes`.
- Crear un usuario administrador.
- Proteger rutas con middlewares `authMiddleware` y `requireAdmin`.
- Código cliente (Astro) mínimo para login, dashboard y gestión rápida de productos.

---

## 1) Migración BD: añadir `role`

Archivo creado: `src/migrations/add_role_to_clientes.sql`

Aplica la migración con `psql` o tu herramienta favorita:

```bash
psql -d TU_BASE_DATOS -f src/migrations/add_role_to_clientes.sql
```

Esto añade la columna `role` con valor por defecto `cliente` y rellena valores nulos.

Si quieres actualizar un usuario a admin manualmente:

```sql
UPDATE clientes SET role = 'administrador' WHERE email = 'admin@gmail.com';
```

---

## 2) Crear admin desde el script

El script `src/scripts/create_admin.js` acepta: `email password nombres [role]` o la opción `--role`.

Ejemplo:

```bash
node src/scripts/create_admin.js admin@tudominio.com StrongPassword "Admin Name" --role administrador
```

Nota: el script intenta conectarse a Postgres, asegúrate de que esté corriendo y que `src/config/database.js` apunte a la BD correcta.

Alternativa: crear con el endpoint de registro y luego ejecutar el UPDATE SQL del punto anterior.

---

## 3) Middlewares de autenticación (backend)

Ficheros relevantes:

- `src/controllers/auth/authMiddleware.js` — exporta `authMiddleware` y `requireAdmin`.
- `src/controllers/auth/authController.js` — `register` y `login` devuelven `role` en el JWT.

Comportamiento esperado:

- `authMiddleware` debe rechazar peticiones sin header `Authorization: Bearer <token>` con 401.
- `requireAdmin` debe comprobar `req.cliente.role` y devolver 403 si no es admin.

Snippet de uso en rutas (ejemplo en `src/routes/ecommerceRoutes.js`):

```js
import { authMiddleware, requireAdmin } from '../controllers/auth/authMiddleware.js';

router.post('/productos', authMiddleware, requireAdmin, upload.any(), createProducto);
router.put('/productos/:id', authMiddleware, requireAdmin, upload.any(), updateProducto);
router.delete('/productos/:id', authMiddleware, requireAdmin, deleteProducto);
```

---

## 4) Endpoints recomendados (backend)

- `POST /auth/register` — registrar usuario (se crea con role `cliente`).
- `POST /auth/login` — devuelve `{ token, cliente }` donde `cliente.role` existe.
- `GET /productos` — público (lista productos).
- `POST /productos` — admin (crea producto).
- `GET /pedidos` — protegido (user/admin según implementación); puedes crear `GET /pedidos/admin` para que sea exclusivo admin.

---

## 5) Frontend (Astro) — Ejemplos mínimos

1) `.env` del frontend:

```
PUBLIC_API_URL=http://localhost:3000/api
```

2) `src/lib/api.js`:

```js
const API = import.meta.env.PUBLIC_API_URL;

export function getToken() {
  return localStorage.getItem('token');
}

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export default API;
```

3) Guard cliente: `src/lib/guard.js`:

```js
export function requireAdminClientSide() {
  const token = localStorage.getItem('token');
  const clienteRaw = localStorage.getItem('cliente');
  if (!token || !clienteRaw) {
    location.href = '/admin/login';
    return null;
  }
  const cliente = JSON.parse(clienteRaw);
  if (cliente.role !== 'administrador' && cliente.role !== 'admin') {
    location.href = '/';
    return null;
  }
  return { token, cliente };
}
```

4) Login (ejemplo simple) — ajusta la ruta según tu backend `/auth/login` o `/api/auth/login`:

```html
<!-- src/pages/admin/login.astro -->
<form id="f">
  <input name="email" required />
  <input name="password" type="password" required />
  <button>Entrar</button>
</form>
<script type="module">
  const f = document.getElementById('f');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(f);
    const email = form.get('email');
    const password = form.get('password');

    const API = import.meta.env.PUBLIC_API_URL.replace('/api', '');
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Error login');
    localStorage.setItem('token', data.token);
    localStorage.setItem('cliente', JSON.stringify(data.cliente));
    location.href = '/admin';
  });
</script>
```

5) Dashboard y Productos — ver los ejemplos en la descripción original del issue (usar `apiFetch` y `requireAdminClientSide`).

---

## 6) Comprobaciones y pruebas

1. Asegúrate de que Postgres esté corriendo y la conexión en `src/config/database.js` sea correcta.
2. Ejecuta la migración.
3. Crea admin (script o register + UPDATE).
4. Inicia backend:

```bash
node src/index.js
```

5. En frontend (Astro), configura `PUBLIC_API_URL` y prueba login, dashboard y creación de producto.

---

Si quieres, puedo añadir un archivo `docs/ADMIN_SETUP.md` más detallado con curl/Postman ejemplos, o generar las páginas Astro en un repo separado. ¿Qué prefieres? 
