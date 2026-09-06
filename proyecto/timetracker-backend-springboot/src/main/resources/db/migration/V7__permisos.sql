CREATE TYPE tipo_permiso AS ENUM ('PARCIAL', 'COMPLETO');

-- Simplificación respecto al diseño inicial de docs/DATABASE_SCHEMA.md: se
-- fusiona BORRADOR/PENDIENTE_ENVIO en un solo estado BORRADOR, ya que en la
-- práctica no hay ninguna acción del usuario que distinga a uno del otro
-- (la previsualización es solo una vista, no una transición). Ver
-- docs/CHANGELOG.md, entrada de Fase 3.
CREATE TYPE estado_permiso AS ENUM ('BORRADOR', 'ENVIADO');

CREATE TABLE permisos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID NOT NULL REFERENCES usuarios(id),
  fecha_solicitud   DATE NOT NULL,
  horas             NUMERIC(4,2) NOT NULL CHECK (horas > 0),
  tipo              tipo_permiso NOT NULL,
  descripcion       TEXT NOT NULL,
  estado            estado_permiso NOT NULL DEFAULT 'BORRADOR',
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_permisos_usuario_fecha ON permisos (usuario_id, fecha_solicitud);
