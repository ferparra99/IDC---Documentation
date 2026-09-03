-- Refresh tokens opacos (no JWT) para permitir revocación real: un JWT no se
-- puede "invalidar" antes de su expiración sin una lista de revocación, y
-- una app móvil necesita poder cerrar sesión de un dispositivo específico.
CREATE TABLE refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID NOT NULL REFERENCES usuarios(id),
  token_hash   VARCHAR(64) NOT NULL UNIQUE, -- sha256 hex del token; nunca se guarda en texto plano
  expira_en    TIMESTAMPTZ NOT NULL,
  revocado     BOOLEAN NOT NULL DEFAULT false,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens (usuario_id);
