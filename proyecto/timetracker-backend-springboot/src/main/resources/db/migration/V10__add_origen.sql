ALTER TABLE registro_jornada ADD COLUMN origen VARCHAR(20) NOT NULL DEFAULT 'fichaje' CHECK (origen IN ('fichaje','manual'));
