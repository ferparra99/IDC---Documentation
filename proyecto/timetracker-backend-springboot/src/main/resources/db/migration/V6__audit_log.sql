CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad         VARCHAR(50) NOT NULL,
  entidad_id      UUID NOT NULL,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id),
  fecha_cambio    TIMESTAMPTZ NOT NULL DEFAULT now(),
  valor_anterior  JSONB NOT NULL,
  valor_nuevo     JSONB NOT NULL,
  motivo          TEXT
);

CREATE INDEX idx_audit_log_entidad ON audit_log (entidad, entidad_id, fecha_cambio);
