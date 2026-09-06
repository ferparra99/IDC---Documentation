CREATE TABLE viajes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID NOT NULL REFERENCES usuarios(id),
  fecha            DATE NOT NULL,
  punto_partida    VARCHAR(255) NOT NULL,
  punto_final      VARCHAR(255) NOT NULL,
  descripcion      TEXT NOT NULL,
  valor            NUMERIC(10,2) NOT NULL DEFAULT 5000,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sin UNIQUE(usuario_id, fecha): un empleado puede registrar múltiples
-- viajes el mismo día (docs/REQUIREMENTS.md sección 5.4).
CREATE INDEX idx_viajes_usuario_fecha ON viajes (usuario_id, fecha);
