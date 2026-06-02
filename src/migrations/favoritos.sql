-- Migration: create favoritos table
CREATE TABLE IF NOT EXISTS favoritos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_favoritos_usuario_producto UNIQUE (usuario_id, producto_id)
);

-- Foreign key constraints (assumes tables `usuarios` and `productos` exist)
ALTER TABLE favoritos
  ADD CONSTRAINT fk_favoritos_usuario
  FOREIGN KEY (usuario_id)
  REFERENCES usuarios(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE favoritos
  ADD CONSTRAINT fk_favoritos_producto
  FOREIGN KEY (producto_id)
  REFERENCES productos(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_favoritos_usuario ON favoritos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_favoritos_producto ON favoritos(producto_id);
