ALTER TABLE productos
ADD COLUMN IF NOT EXISTS categoria_id INT;

ALTER TABLE productos
DROP CONSTRAINT IF EXISTS fk_productos_categoria;

ALTER TABLE productos
ADD CONSTRAINT fk_productos_categoria
FOREIGN KEY (categoria_id)
REFERENCES categorias(id)
ON UPDATE CASCADE
ON DELETE SET NULL;

ALTER TABLE productos
DROP COLUMN IF EXISTS categoria;