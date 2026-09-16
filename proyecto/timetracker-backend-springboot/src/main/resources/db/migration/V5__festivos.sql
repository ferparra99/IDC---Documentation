CREATE TABLE festivos (
  fecha             DATE PRIMARY KEY,
  nombre            VARCHAR(150) NOT NULL,
  pais              VARCHAR(2) NOT NULL DEFAULT 'CO',
  sincronizado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
