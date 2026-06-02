
import jwt from "jsonwebtoken";
import { ROLE_ADMIN } from "../config/roles.js";

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Espera formato "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // set both `user` and `cliente` for compatibility
        req.user = decoded;
        req.usuario = decoded;
        req.cliente = decoded;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Token inválido o expirado' });
    }
};

// Export alias for backward compatibility: `requireAuth`
export const requireAuth = authMiddleware;

export function requireAdmin(req, res, next) {
  const role = req.usuario && (req.usuario.role || req.usuario.rol || req.usuario.role_name);
  if (!role) return res.status(401).json({ error: 'No autorizado' });
  if (role !== ROLE_ADMIN) return res.status(403).json({ error: 'Se requieren permisos de administrador' });
  return next();
}