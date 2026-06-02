DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'usuarios_telefono_formato_chk'
  ) THEN
    ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_telefono_formato_chk
    CHECK (telefono IS NULL OR telefono ~ '^[0-9]{9}$')
    NOT VALID;
  END IF;
END $$;
