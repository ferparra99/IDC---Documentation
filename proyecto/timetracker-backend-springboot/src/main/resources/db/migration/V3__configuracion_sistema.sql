CREATE TABLE configuracion_sistema (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave           VARCHAR(80) NOT NULL,
  valor           JSONB NOT NULL,
  vigente_desde   DATE NOT NULL,
  vigente_hasta   DATE,
  creado_por      UUID REFERENCES usuarios(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clave, vigente_desde)
);

CREATE INDEX idx_configuracion_clave_vigencia ON configuracion_sistema (clave, vigente_hasta);
