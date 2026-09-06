CREATE TYPE estado_jornada AS ENUM (
  'SIN_INICIAR',
  'JORNADA_ACTIVA',
  'JORNADA_FINALIZADA',
  'EN_PERMISO' -- reservado para Fase 3, aún sin uso
);

CREATE TABLE registro_jornada (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id               UUID NOT NULL REFERENCES usuarios(id),
  fecha                    DATE NOT NULL, -- fecha de INICIO (docs/STATE_MACHINE.md 3.1)
  hora_inicio              TIMESTAMPTZ,
  hora_fin                 TIMESTAMPTZ,
  estado                   estado_jornada NOT NULL DEFAULT 'SIN_INICIAR',
  descripcion_proyectos    TEXT,
  horas_ordinarias         NUMERIC(5,2) NOT NULL DEFAULT 0,
  horas_extra_diurnas      NUMERIC(5,2) NOT NULL DEFAULT 0,
  horas_extra_nocturnas    NUMERIC(5,2) NOT NULL DEFAULT 0,
  horas_recargo_nocturno   NUMERIC(5,2) NOT NULL DEFAULT 0,
  horas_dominical_festivo  NUMERIC(5,2) NOT NULL DEFAULT 0,
  editado_manualmente      BOOLEAN NOT NULL DEFAULT false,
  creado_en                TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, fecha)
);

CREATE INDEX idx_registro_jornada_usuario_fecha ON registro_jornada (usuario_id, fecha);
CREATE INDEX idx_registro_jornada_estado ON registro_jornada (usuario_id, estado);
