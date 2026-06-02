-- inspect_favoritos.sql
-- Uso: psql -h <host> -p <port> -U <user> -d <db> -f inspect_favoritos.sql
-- Este script muestra conteos, filas legibles, duplicados y contiene un bloque para respaldar/eliminar duplicados.

-- 1) Conteo total
SELECT 'total_favoritos' AS descripcion, count(*) AS total FROM favoritos;

-- 2) Filas legibles (join a clientes y productos)
SELECT f.id, f.cliente_id, c.nombres AS cliente, f.producto_id, p.nombre AS producto, f.creado_en
FROM favoritos f
LEFT JOIN clientes c ON c.id = f.cliente_id
LEFT JOIN productos p ON p.id = f.producto_id
ORDER BY f.cliente_id, f.producto_id, f.creado_en;

-- 3) Duplicados (cliente_id + producto_id con más de 1 fila)
SELECT cliente_id, producto_id, count(*) AS cnt
FROM favoritos
GROUP BY cliente_id, producto_id
HAVING count(*) > 1
ORDER BY cnt DESC;

-- 4) (Opcional) Respaldar tabla favoritos en una nueva tabla
-- Ejecuta esto si quieres crear una copia rápida antes de borrar
-- CREATE TABLE IF NOT EXISTS favoritos_backup AS TABLE favoritos;

-- 5) (Opcional) Eliminar duplicados manteniendo la fila más reciente (por creado_en)
-- Descomenta para ejecutar. Recomendado: ejecutar el respaldo primero.
-- BEGIN;
-- WITH ranked AS (
--   SELECT id, ROW_NUMBER() OVER (PARTITION BY cliente_id, producto_id ORDER BY creado_en DESC, id DESC) AS rn
--   FROM favoritos
-- )
-- DELETE FROM favoritos
-- WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
-- COMMIT;

-- 6) Verificación posterior (ejecutar después de la eliminación)
-- SELECT cliente_id, producto_id, count(*) AS cnt FROM favoritos GROUP BY cliente_id, producto_id HAVING count(*) > 1;
-- SELECT count(*) FROM favoritos;
