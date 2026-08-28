-- Archivering (deactivering) van medewerkers.
--
-- Een gearchiveerde medewerker kan niet meer inloggen (de app-laag controleert
-- dit bij het inloggen) en verdwijnt uit keuzelijsten/overzichten. Het record
-- blijft bestaan zodat historie (reserveringen, transacties) intact blijft.
ALTER TABLE medewerkers
  ADD COLUMN IF NOT EXISTS gearchiveerd BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_medewerkers_gearchiveerd ON medewerkers (gearchiveerd);
