-- Lesplannen-feature: doorzoekbare catalogus van lesmateriaal (documenten/links),
-- koppelbaar aan workshops en/of fysiek materiaal, getagd met doelgroep (schoolgroep),
-- vrije thema-labels (hergebruik van de bestaande labels-tabel) en officiële
-- SLO-kerndoelen.

-- 1. Lesplannen tabel
CREATE TABLE IF NOT EXISTS lesplannen (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titel                   TEXT NOT NULL,
  omschrijving            TEXT,
  bestand_url             TEXT,           -- link naar document; later evt. Supabase Storage-URL (zelfde kolom)
  aangemaakt_door         UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  aangemaakt_op           TIMESTAMPTZ DEFAULT NOW(),
  laatst_bijgewerkt_op    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Doelgroepen tabel — vaste, geordende lijst van schoolgroepen (geen vrije labels)
CREATE TABLE IF NOT EXISTS doelgroepen (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  naam            TEXT NOT NULL UNIQUE,
  volgorde        INTEGER NOT NULL
);

-- 3. Kerndoelen tabel — officiële referentiedata (SLO), niet vrij beheerbaar
CREATE TABLE IF NOT EXISTS kerndoelen (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code            TEXT NOT NULL,
  sector          TEXT NOT NULL CHECK (sector IN ('po', 'vo', 'so', 'vso')),
  vakgebied       TEXT NOT NULL,
  domein          TEXT,
  omschrijving    TEXT NOT NULL,
  aangemaakt_op   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (code, sector)
);

-- 4. Koppeltabellen (many-to-many)
CREATE TABLE IF NOT EXISTS lesplan_doelgroepen (
  lesplan_id      UUID NOT NULL REFERENCES lesplannen(id) ON DELETE CASCADE,
  doelgroep_id    UUID NOT NULL REFERENCES doelgroepen(id) ON DELETE CASCADE,
  PRIMARY KEY (lesplan_id, doelgroep_id)
);

CREATE TABLE IF NOT EXISTS lesplan_kerndoelen (
  lesplan_id      UUID NOT NULL REFERENCES lesplannen(id) ON DELETE CASCADE,
  kerndoel_id     UUID NOT NULL REFERENCES kerndoelen(id) ON DELETE CASCADE,
  PRIMARY KEY (lesplan_id, kerndoel_id)
);

CREATE TABLE IF NOT EXISTS lesplan_labels (
  lesplan_id      UUID NOT NULL REFERENCES lesplannen(id) ON DELETE CASCADE,
  label_id        UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (lesplan_id, label_id)
);

CREATE TABLE IF NOT EXISTS lesplan_workshops (
  lesplan_id            UUID NOT NULL REFERENCES lesplannen(id) ON DELETE CASCADE,
  workshop_template_id  UUID NOT NULL REFERENCES workshop_templates(id) ON DELETE CASCADE,
  PRIMARY KEY (lesplan_id, workshop_template_id)
);

CREATE TABLE IF NOT EXISTS lesplan_materiaal (
  lesplan_id      UUID NOT NULL REFERENCES lesplannen(id) ON DELETE CASCADE,
  materiaal_id    UUID NOT NULL REFERENCES materiaal(id) ON DELETE CASCADE,
  PRIMARY KEY (lesplan_id, materiaal_id)
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_kerndoelen_sector ON kerndoelen(sector);
CREATE INDEX IF NOT EXISTS idx_kerndoelen_vakgebied ON kerndoelen(vakgebied);

CREATE INDEX IF NOT EXISTS idx_lesplan_doelgroepen_lesplan ON lesplan_doelgroepen(lesplan_id);
CREATE INDEX IF NOT EXISTS idx_lesplan_doelgroepen_doelgroep ON lesplan_doelgroepen(doelgroep_id);

CREATE INDEX IF NOT EXISTS idx_lesplan_kerndoelen_lesplan ON lesplan_kerndoelen(lesplan_id);
CREATE INDEX IF NOT EXISTS idx_lesplan_kerndoelen_kerndoel ON lesplan_kerndoelen(kerndoel_id);

CREATE INDEX IF NOT EXISTS idx_lesplan_labels_lesplan ON lesplan_labels(lesplan_id);
CREATE INDEX IF NOT EXISTS idx_lesplan_labels_label ON lesplan_labels(label_id);

CREATE INDEX IF NOT EXISTS idx_lesplan_workshops_lesplan ON lesplan_workshops(lesplan_id);
CREATE INDEX IF NOT EXISTS idx_lesplan_workshops_workshop ON lesplan_workshops(workshop_template_id);

CREATE INDEX IF NOT EXISTS idx_lesplan_materiaal_lesplan ON lesplan_materiaal(lesplan_id);
CREATE INDEX IF NOT EXISTS idx_lesplan_materiaal_materiaal ON lesplan_materiaal(materiaal_id);

-- 6. Row Level Security — zelfde patroon als de rest van de app: iedereen mag
-- lezen/schrijven op DB-niveau, beheerder-check gebeurt in de app-laag.
ALTER TABLE lesplannen          ENABLE ROW LEVEL SECURITY;
ALTER TABLE doelgroepen         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kerndoelen          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_doelgroepen ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_kerndoelen  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_labels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_workshops   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_materiaal   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan lesplannen zien en beheren" ON lesplannen
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan doelgroepen zien en beheren" ON doelgroepen
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan kerndoelen zien en beheren" ON kerndoelen
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan lesplan_doelgroepen zien en beheren" ON lesplan_doelgroepen
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan lesplan_kerndoelen zien en beheren" ON lesplan_kerndoelen
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan lesplan_labels zien en beheren" ON lesplan_labels
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan lesplan_workshops zien en beheren" ON lesplan_workshops
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan lesplan_materiaal zien en beheren" ON lesplan_materiaal
  FOR ALL USING (true);
