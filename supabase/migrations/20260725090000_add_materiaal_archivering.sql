-- Archiveren van materiaal: verwijderen zonder historie/transacties te verliezen.
-- Gearchiveerd materiaal verdwijnt uit alle "kies materiaal"-lijsten, maar blijft
-- via een oude QR-sticker of directe link nog gewoon bereikbaar.

ALTER TABLE materiaal ADD COLUMN IF NOT EXISTS gearchiveerd BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_materiaal_gearchiveerd ON materiaal(gearchiveerd);
