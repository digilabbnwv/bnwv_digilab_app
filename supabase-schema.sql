-- ============================================================
-- Digilab App — Supabase Database Schema
-- Bibliotheek Noordwest Veluwe — Maart 2026
-- ============================================================
-- Voer dit script uit in de Supabase SQL Editor van jouw project.
-- ============================================================

-- 1. Medewerkers tabel
CREATE TABLE IF NOT EXISTS medewerkers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  naam            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  pincode_hash    TEXT NOT NULL,
  rol             TEXT NOT NULL DEFAULT 'medewerker' CHECK (rol IN ('medewerker', 'beheerder')),
  aangemaakt_op   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Materiaal tabel
CREATE TABLE IF NOT EXISTS materiaal (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  naam                    TEXT NOT NULL,
  merk                    TEXT,                             -- Merknaam, bijv. Sphero, LEGO, ClassVR
  type                    TEXT NOT NULL,
  categorie_prefix        CHAR(4) NOT NULL DEFAULT 'OVER', -- 4-letterige categorie-code, bijv. CHRO, TABL, VRBR
  qr_code                 TEXT NOT NULL UNIQUE,             -- Formaat: BNWV-DIGI-XXXX-NNNN
  aantal                  INTEGER,                          -- Aantal stuks in de set/kit, bijv. 8 (Sphero Indi)
  omschrijving            TEXT,                             -- Open omschrijving van het apparaat
  inhoud                  TEXT,                             -- Inventarislijst / onderdelen
  standaard_locatie       TEXT,
  huidige_locatie         TEXT,
  huidige_medewerker_id   UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  laatste_medewerker_naam TEXT,
  status                  TEXT NOT NULL DEFAULT 'beschikbaar' CHECK (status IN ('beschikbaar', 'in_gebruik')),
  aangemaakt_op           TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transacties tabel (auditlog)
CREATE TABLE IF NOT EXISTS transacties (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  materiaal_id    UUID NOT NULL REFERENCES materiaal(id) ON DELETE CASCADE,
  medewerker_id   UUID NOT NULL REFERENCES medewerkers(id) ON DELETE RESTRICT,
  type            TEXT NOT NULL CHECK (type IN ('uitchecken', 'inchecken', 'overrule', 'locatiewijziging')),
  locatie         TEXT,
  tijdstip        TIMESTAMPTZ DEFAULT NOW(),
  notitie         TEXT,
  reservering_id  UUID REFERENCES reserveringen(id) ON DELETE SET NULL  -- Koppeling met reservering (nullable, alleen bij ophalen voor reservering)
);

-- 4. Onderhoudsmeldingen tabel
CREATE TABLE IF NOT EXISTS onderhoudsmeldingen (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  materiaal_id        UUID NOT NULL REFERENCES materiaal(id) ON DELETE CASCADE,
  gemeld_door         UUID NOT NULL REFERENCES medewerkers(id) ON DELETE RESTRICT,
  type_melding        TEXT NOT NULL CHECK (type_melding IN ('kapot', 'mist', 'verbruiksmateriaal')),
  toelichting         TEXT,
  foto_url            TEXT,
  status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'opgelost')),
  opgelost_door       UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  tijdstip_gemeld     TIMESTAMPTZ DEFAULT NOW(),
  tijdstip_opgelost   TIMESTAMPTZ
);

-- 5. Reserveringen tabel
-- van_datum / tot_datum zijn ISO 8601 datums (YYYY-MM-DD).
-- Toekomstig: sync met ictleskisten@bibliotheeknwveluwe.nl via Microsoft Graph API (iCalendar / Exchange).
CREATE TABLE IF NOT EXISTS reserveringen (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  materiaal_id    UUID NOT NULL REFERENCES materiaal(id) ON DELETE CASCADE,
  medewerker_id   UUID NOT NULL REFERENCES medewerkers(id) ON DELETE RESTRICT,
  van_datum       DATE NOT NULL,
  tot_datum       DATE NOT NULL CHECK (tot_datum >= van_datum),
  toelichting     TEXT,
  status          TEXT NOT NULL DEFAULT 'actief' CHECK (status IN ('actief', 'geannuleerd', 'opgehaald')),
  aangemaakt_op   TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Workshop templates (catalogus)
CREATE TABLE IF NOT EXISTS workshop_templates (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titel                   TEXT NOT NULL,
  toelichting             TEXT,
  materiaal_omschrijving  TEXT,           -- bijv. "Micro:bits set" (vrije tekst)
  materiaal_ids           UUID[],         -- verwijzingen naar materiaal-tabel
  min_deelnemers          INTEGER DEFAULT 1,
  max_deelnemers          INTEGER DEFAULT 10,
  doelgroep               TEXT,           -- bijv. '8-12 jr', 'Volwassenen'
  standaard_kosten        DECIMAL(6,2),
  standaard_duur_minuten  INTEGER DEFAULT 60,
  webshop_url             TEXT,
  toelichting_url         TEXT,
  aangemaakt_door         UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  aangemaakt_op           TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Geplande workshops (kalender)
CREATE TABLE IF NOT EXISTS geplande_workshops (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id             UUID REFERENCES workshop_templates(id) ON DELETE SET NULL,
  titel                   TEXT NOT NULL,
  datum                   DATE NOT NULL,
  start_tijd              TIME NOT NULL,
  eind_tijd               TIME NOT NULL,
  locatie                 TEXT NOT NULL,
  doelgroep               TEXT,
  max_deelnemers          INTEGER DEFAULT 10,
  kosten                  DECIMAL(6,2),
  status                  TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'gepubliceerd', 'geannuleerd')),
  uitvoerder_id           UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  ruimte_geregeld         BOOLEAN DEFAULT false,
  in_jaarkalender         BOOLEAN DEFAULT false,
  in_webshop              BOOLEAN DEFAULT false,
  webshop_product_url     TEXT,
  opmerkingen             TEXT,
  planning_batch_id       UUID,
  materiaal_id            UUID REFERENCES materiaal(id) ON DELETE SET NULL,
  aangemaakt_door         UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  aangemaakt_op           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexen voor performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_materiaal_qr_code ON materiaal(qr_code);
CREATE INDEX IF NOT EXISTS idx_materiaal_status ON materiaal(status);
CREATE INDEX IF NOT EXISTS idx_materiaal_categorie ON materiaal(categorie_prefix);
CREATE INDEX IF NOT EXISTS idx_transacties_materiaal_id ON transacties(materiaal_id);
CREATE INDEX IF NOT EXISTS idx_transacties_medewerker_id ON transacties(medewerker_id);
CREATE INDEX IF NOT EXISTS idx_onderhoud_materiaal_id ON onderhoudsmeldingen(materiaal_id);
CREATE INDEX IF NOT EXISTS idx_onderhoud_status ON onderhoudsmeldingen(status);
CREATE INDEX IF NOT EXISTS idx_reserveringen_materiaal ON reserveringen(materiaal_id);
CREATE INDEX IF NOT EXISTS idx_reserveringen_medewerker ON reserveringen(medewerker_id);
CREATE INDEX IF NOT EXISTS idx_reserveringen_datum ON reserveringen(van_datum, tot_datum);
CREATE INDEX IF NOT EXISTS idx_geplande_workshops_datum ON geplande_workshops(datum);
CREATE INDEX IF NOT EXISTS idx_geplande_workshops_status ON geplande_workshops(status);
CREATE INDEX IF NOT EXISTS idx_geplande_workshops_locatie ON geplande_workshops(locatie);

-- ============================================================
-- Row Level Security (RLS) — Eenvoudig: alle medewerkers mogen alles
-- ============================================================
ALTER TABLE medewerkers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiaal          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE onderhoudsmeldingen ENABLE ROW LEVEL SECURITY;

ALTER TABLE workshop_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE geplande_workshops  ENABLE ROW LEVEL SECURITY;

-- Iedereen mag lezen; schrijven beperkt tot beheerders in de app-laag
CREATE POLICY "Iedereen kan medewerkers zien" ON medewerkers
  FOR SELECT USING (true);

CREATE POLICY "Iedereen kan medewerker aanmaken" ON medewerkers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Medewerker kan eigen record updaten" ON medewerkers
  FOR UPDATE USING (true);

CREATE POLICY "Iedereen kan materiaal zien" ON materiaal
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan transacties zien en aanmaken" ON transacties
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan meldingen zien en aanmaken" ON onderhoudsmeldingen
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan workshop templates zien en beheren" ON workshop_templates
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan geplande workshops zien en beheren" ON geplande_workshops
  FOR ALL USING (true);

-- ============================================================
-- Supabase Storage bucket voor foto's
-- ============================================================
-- Maak een nieuwe bucket aan genaamd 'fotos' in Supabase Storage (Dashboard > Storage)
-- Stel de bucket in als public zodat foto URLs toegankelijk zijn.

-- ============================================================
-- Testdata (optioneel — verwijder in productie)
-- ============================================================
-- INSERT INTO materiaal (naam, type, qr_code, standaard_locatie, huidige_locatie, status)
-- VALUES
--   ('Chromebook Dell #1', 'Chromebook', 'item_test_001', 'Ermelo', 'Ermelo', 'beschikbaar'),
--   ('iPad Pro 12"',       'Tablet',     'item_test_002', 'Nunspeet', 'Nunspeet', 'beschikbaar'),
--   ('VR-bril Meta Quest', 'VR-bril',    'item_test_003', 'Ermelo', 'Ermelo', 'beschikbaar');
