-- Lesbrieven-uitbreiding: gestructureerde inhoud, eigen thema's, lessenseries,
-- bestanden, diepgang per kerndoel en een concept/gepubliceerd-status.
-- Bouwt voort op de bestaande lesplannen-feature (20260724100000_add_lesplannen.sql).

-- 1. Nieuwe kolommen op lesplannen (gestructureerde lesbrief-inhoud + status)
ALTER TABLE lesplannen
  ADD COLUMN IF NOT EXISTS status                TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'gepubliceerd')),
  ADD COLUMN IF NOT EXISTS lesduur_minuten       INTEGER,
  ADD COLUMN IF NOT EXISTS groepsgrootte         TEXT,
  ADD COLUMN IF NOT EXISTS voorbereiding         TEXT,
  ADD COLUMN IF NOT EXISTS benodigdheden         TEXT,
  ADD COLUMN IF NOT EXISTS lesverloop_intro      TEXT,
  ADD COLUMN IF NOT EXISTS lesverloop_kern       TEXT,
  ADD COLUMN IF NOT EXISTS lesverloop_afsluiting TEXT,
  ADD COLUMN IF NOT EXISTS differentiatie        TEXT,
  ADD COLUMN IF NOT EXISTS evaluatie             TEXT,
  ADD COLUMN IF NOT EXISTS tips                  TEXT,
  ADD COLUMN IF NOT EXISTS leerdoelen            JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Bestaande lesplannen waren al zichtbaar → als gepubliceerd markeren.
UPDATE lesplannen SET status = 'gepubliceerd';

-- 2. Diepgang per kerndoel-koppeling (kennismaking / verdieping / beheersing)
ALTER TABLE lesplan_kerndoelen
  ADD COLUMN IF NOT EXISTS diepgang TEXT CHECK (diepgang IN ('kennismaking', 'verdieping', 'beheersing'));

-- 3. Thema's — eigen begrip voor lessen, los van de materiaal-labels
CREATE TABLE IF NOT EXISTS themas (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  naam          TEXT NOT NULL UNIQUE,
  kleur         TEXT,
  volgorde      INTEGER,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesplan_themas (
  lesplan_id  UUID NOT NULL REFERENCES lesplannen(id) ON DELETE CASCADE,
  thema_id    UUID NOT NULL REFERENCES themas(id) ON DELETE CASCADE,
  PRIMARY KEY (lesplan_id, thema_id)
);

-- 4. Lessenseries — geordende reeksen; de volgorde staat op de koppeling
CREATE TABLE IF NOT EXISTS lessenseries (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  naam          TEXT NOT NULL,
  omschrijving  TEXT,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesplan_series (
  lesplan_id  UUID NOT NULL REFERENCES lesplannen(id) ON DELETE CASCADE,
  serie_id    UUID NOT NULL REFERENCES lessenseries(id) ON DELETE CASCADE,
  volgorde    INTEGER,
  PRIMARY KEY (lesplan_id, serie_id)
);

-- 5. Bestanden bij een lesplan (presentaties, werkbladen; Supabase Storage-URL's)
CREATE TABLE IF NOT EXISTS lesplan_bestanden (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesplan_id    UUID NOT NULL REFERENCES lesplannen(id) ON DELETE CASCADE,
  bestand_url   TEXT NOT NULL,
  bestandsnaam  TEXT,
  soort         TEXT CHECK (soort IN ('presentatie', 'werkblad', 'handleiding', 'overig')),
  grootte_bytes INTEGER,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexen
CREATE INDEX IF NOT EXISTS idx_lesplan_themas_lesplan     ON lesplan_themas(lesplan_id);
CREATE INDEX IF NOT EXISTS idx_lesplan_themas_thema       ON lesplan_themas(thema_id);
CREATE INDEX IF NOT EXISTS idx_lesplan_series_lesplan     ON lesplan_series(lesplan_id);
CREATE INDEX IF NOT EXISTS idx_lesplan_series_serie       ON lesplan_series(serie_id);
CREATE INDEX IF NOT EXISTS idx_lesplan_bestanden_lesplan  ON lesplan_bestanden(lesplan_id);
CREATE INDEX IF NOT EXISTS idx_lesplannen_status          ON lesplannen(status);

-- 7. Row Level Security — zelfde patroon: open op DB-niveau, beheerder-check in de app-laag
ALTER TABLE themas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessenseries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_themas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_series     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_bestanden  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Iedereen kan themas zien en beheren" ON themas;
CREATE POLICY "Iedereen kan themas zien en beheren" ON themas FOR ALL USING (true);

DROP POLICY IF EXISTS "Iedereen kan lessenseries zien en beheren" ON lessenseries;
CREATE POLICY "Iedereen kan lessenseries zien en beheren" ON lessenseries FOR ALL USING (true);

DROP POLICY IF EXISTS "Iedereen kan lesplan_themas zien en beheren" ON lesplan_themas;
CREATE POLICY "Iedereen kan lesplan_themas zien en beheren" ON lesplan_themas FOR ALL USING (true);

DROP POLICY IF EXISTS "Iedereen kan lesplan_series zien en beheren" ON lesplan_series;
CREATE POLICY "Iedereen kan lesplan_series zien en beheren" ON lesplan_series FOR ALL USING (true);

DROP POLICY IF EXISTS "Iedereen kan lesplan_bestanden zien en beheren" ON lesplan_bestanden;
CREATE POLICY "Iedereen kan lesplan_bestanden zien en beheren" ON lesplan_bestanden FOR ALL USING (true);

-- 8. Seed enkele thema's
INSERT INTO themas (naam, kleur, volgorde) VALUES
  ('Programmeren',         '#E8772E', 1),
  ('Robotica',             '#3B82F6', 2),
  ('Mediawijsheid',        '#A855F7', 3),
  ('Digitaal burgerschap', '#10B981', 4)
ON CONFLICT (naam) DO NOTHING;

-- LET OP: maak in het Supabase-dashboard nog een PUBLIEKE Storage-bucket 'lesmateriaal'
-- aan (zoals de bestaande 'fotos'-bucket) voor het uploaden van presentaties/werkbladen.
