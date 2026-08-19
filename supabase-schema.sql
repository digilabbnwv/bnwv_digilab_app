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
  gearchiveerd            BOOLEAN NOT NULL DEFAULT false,   -- verborgen uit keuzelijsten, blijft bereikbaar via QR/link
  aangemaakt_op           TIMESTAMPTZ DEFAULT NOW()
);

-- 2b. Labels tabel (vrij te beheren tags voor materiaal, bijv. Digitaal, Leesbevordering)
CREATE TABLE IF NOT EXISTS labels (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  naam            TEXT NOT NULL UNIQUE,
  kleur           TEXT,                             -- optionele hex-kleur voor de chip in de UI
  aangemaakt_op   TIMESTAMPTZ DEFAULT NOW()
);

-- 2c. Koppeltabel materiaal <-> labels (many-to-many)
CREATE TABLE IF NOT EXISTS materiaal_labels (
  materiaal_id    UUID NOT NULL REFERENCES materiaal(id) ON DELETE CASCADE,
  label_id        UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (materiaal_id, label_id)
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
  type_melding        TEXT NOT NULL CHECK (type_melding IN ('kapot', 'mist', 'verbruiksmateriaal', 'anders')),
  toelichting         TEXT,
  foto_url            TEXT,
  -- Levenscyclus: nieuw -> in_behandeling -> afgerond
  status              TEXT NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'in_behandeling', 'afgerond')),
  opgelost_door       UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  tijdstip_gemeld           TIMESTAMPTZ DEFAULT NOW(),
  tijdstip_in_behandeling   TIMESTAMPTZ,
  tijdstip_opgelost         TIMESTAMPTZ
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
  -- actief=gereserveerd · opgehaald=opgehaald & loopt nog · teruggebracht=afgerond · geannuleerd=vervallen vóór gebruik
  status          TEXT NOT NULL DEFAULT 'actief' CHECK (status IN ('actief', 'geannuleerd', 'opgehaald', 'teruggebracht')),
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
  materiaal_ids           UUID[],         -- array van gekoppelde materialen
  aangemaakt_door         UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  aangemaakt_op           TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Logins tabel (auditlog voor inlog-metrics)
CREATE TABLE IF NOT EXISTS logins (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medewerker_id   UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  tijdstip        TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Rapportage-ontvangers (voor de periodieke metrics-e-mail)
CREATE TABLE IF NOT EXISTS rapportage_ontvangers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  actief          BOOLEAN NOT NULL DEFAULT true,
  toegevoegd_op   TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Lesplannen — doorzoekbare catalogus van lesmateriaal (documenten/links),
-- koppelbaar aan workshops en/of fysiek materiaal.
CREATE TABLE IF NOT EXISTS lesplannen (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titel                   TEXT NOT NULL,
  omschrijving            TEXT,
  status                  TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'gepubliceerd')),
  lesduur_minuten         INTEGER,
  groepsgrootte           TEXT,
  voorbereiding           TEXT,
  benodigdheden           TEXT,
  lesverloop_intro        TEXT,
  lesverloop_kern         TEXT,
  lesverloop_afsluiting   TEXT,
  differentiatie          TEXT,
  evaluatie               TEXT,
  tips                    TEXT,
  leerdoelen              JSONB NOT NULL DEFAULT '[]'::jsonb,
  bestand_url             TEXT,           -- uitgefaseerd; echte bestanden staan in lesplan_bestanden
  aangemaakt_door         UUID REFERENCES medewerkers(id) ON DELETE SET NULL,
  aangemaakt_op           TIMESTAMPTZ DEFAULT NOW(),
  laatst_bijgewerkt_op    TIMESTAMPTZ DEFAULT NOW()
);

-- 10b. Doelgroepen — vaste, geordende lijst van schoolgroepen (geen vrije labels)
CREATE TABLE IF NOT EXISTS doelgroepen (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  naam            TEXT NOT NULL UNIQUE,
  volgorde        INTEGER NOT NULL
);

-- 10c. Kerndoelen — officiële referentiedata (SLO), niet vrij beheerbaar
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

-- 10d. Koppeltabellen lesplannen (many-to-many)
CREATE TABLE IF NOT EXISTS lesplan_doelgroepen (
  lesplan_id      UUID NOT NULL REFERENCES lesplannen(id) ON DELETE CASCADE,
  doelgroep_id    UUID NOT NULL REFERENCES doelgroepen(id) ON DELETE CASCADE,
  PRIMARY KEY (lesplan_id, doelgroep_id)
);

CREATE TABLE IF NOT EXISTS lesplan_kerndoelen (
  lesplan_id      UUID NOT NULL REFERENCES lesplannen(id) ON DELETE CASCADE,
  kerndoel_id     UUID NOT NULL REFERENCES kerndoelen(id) ON DELETE CASCADE,
  diepgang        TEXT CHECK (diepgang IN ('kennismaking', 'verdieping', 'beheersing')),
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

-- 10e. Thema's — eigen begrip voor lessen (los van materiaal-labels) + koppeling
CREATE TABLE IF NOT EXISTS themas (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  naam            TEXT NOT NULL UNIQUE,
  kleur           TEXT,
  volgorde        INTEGER,
  aangemaakt_op   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesplan_themas (
  lesplan_id      UUID NOT NULL REFERENCES lesplannen(id) ON DELETE CASCADE,
  thema_id        UUID NOT NULL REFERENCES themas(id) ON DELETE CASCADE,
  PRIMARY KEY (lesplan_id, thema_id)
);

-- 10f. Lessenseries — geordende reeksen lessen; volgorde staat op de koppeling
CREATE TABLE IF NOT EXISTS lessenseries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  naam            TEXT NOT NULL,
  omschrijving    TEXT,
  aangemaakt_op   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesplan_series (
  lesplan_id      UUID NOT NULL REFERENCES lesplannen(id) ON DELETE CASCADE,
  serie_id        UUID NOT NULL REFERENCES lessenseries(id) ON DELETE CASCADE,
  volgorde        INTEGER,
  PRIMARY KEY (lesplan_id, serie_id)
);

-- 10g. Bestanden bij een lesplan (presentaties/werkbladen; Supabase Storage-URL's)
CREATE TABLE IF NOT EXISTS lesplan_bestanden (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesplan_id      UUID NOT NULL REFERENCES lesplannen(id) ON DELETE CASCADE,
  bestand_url     TEXT NOT NULL,
  bestandsnaam    TEXT,
  soort           TEXT CHECK (soort IN ('presentatie', 'werkblad', 'handleiding', 'overig')),
  grootte_bytes   INTEGER,
  aangemaakt_op   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexen voor performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_materiaal_qr_code ON materiaal(qr_code);
CREATE INDEX IF NOT EXISTS idx_materiaal_status ON materiaal(status);
CREATE INDEX IF NOT EXISTS idx_materiaal_categorie ON materiaal(categorie_prefix);
CREATE INDEX IF NOT EXISTS idx_materiaal_gearchiveerd ON materiaal(gearchiveerd);
CREATE INDEX IF NOT EXISTS idx_materiaal_labels_materiaal ON materiaal_labels(materiaal_id);
CREATE INDEX IF NOT EXISTS idx_materiaal_labels_label ON materiaal_labels(label_id);
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
CREATE INDEX IF NOT EXISTS idx_geplande_workshops_materiaal ON geplande_workshops USING GIN (materiaal_ids);
CREATE INDEX IF NOT EXISTS idx_logins_medewerker_tijdstip ON logins(medewerker_id, tijdstip);
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

-- ============================================================
-- Row Level Security (RLS) — Eenvoudig: alle medewerkers mogen alles
-- ============================================================
ALTER TABLE medewerkers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiaal          ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiaal_labels   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE onderhoudsmeldingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserveringen       ENABLE ROW LEVEL SECURITY;

ALTER TABLE workshop_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE geplande_workshops  ENABLE ROW LEVEL SECURITY;
ALTER TABLE logins              ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapportage_ontvangers ENABLE ROW LEVEL SECURITY;

ALTER TABLE lesplannen          ENABLE ROW LEVEL SECURITY;
ALTER TABLE doelgroepen         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kerndoelen          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_doelgroepen ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_kerndoelen  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_labels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_workshops   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_materiaal   ENABLE ROW LEVEL SECURITY;
ALTER TABLE themas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessenseries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_themas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_series      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesplan_bestanden   ENABLE ROW LEVEL SECURITY;

-- Iedereen mag lezen; schrijven beperkt tot beheerders in de app-laag
CREATE POLICY "Iedereen kan medewerkers zien" ON medewerkers
  FOR SELECT USING (true);

CREATE POLICY "Iedereen kan medewerker aanmaken" ON medewerkers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Medewerker kan eigen record updaten" ON medewerkers
  FOR UPDATE USING (true);

CREATE POLICY "Iedereen kan materiaal zien" ON materiaal
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan labels zien en beheren" ON labels
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan materiaal_labels zien en beheren" ON materiaal_labels
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan transacties zien en aanmaken" ON transacties
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan meldingen zien en aanmaken" ON onderhoudsmeldingen
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan reserveringen zien en beheren" ON reserveringen
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan workshop templates zien en beheren" ON workshop_templates
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan geplande workshops zien en beheren" ON geplande_workshops
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan logins zien en aanmaken" ON logins
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan rapportage ontvangers zien en beheren" ON rapportage_ontvangers
  FOR ALL USING (true);

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

CREATE POLICY "Iedereen kan themas zien en beheren" ON themas
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan lessenseries zien en beheren" ON lessenseries
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan lesplan_themas zien en beheren" ON lesplan_themas
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan lesplan_series zien en beheren" ON lesplan_series
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan lesplan_bestanden zien en beheren" ON lesplan_bestanden
  FOR ALL USING (true);

-- ============================================================
-- Supabase Storage bucket voor foto's
-- ============================================================
-- Maak een nieuwe bucket aan genaamd 'fotos' in Supabase Storage (Dashboard > Storage)
-- Stel de bucket in als public zodat foto URLs toegankelijk zijn.

-- ============================================================
-- Periodieke metrics-rapportage (pg_cron + pg_net)
-- ============================================================
-- Voer dit blok handmatig uit in de Supabase SQL Editor (niet automatisch via dit
-- script, want het bevat project-specifieke waarden).
--
-- De Edge Function metrics-rapportage is bewust gedeployed MET actieve
-- JWT-verificatie (Supabase-default, niet met --no-verify-jwt). pg_net stuurt
-- daarom naast de eigen 'x-digilab-secret'-header ook een 'Authorization: Bearer
-- <anon-key>'-header mee, zodat de aanroep de platform-brede JWT-check haalt.
-- De anon-key is een publieke sleutel (dezelfde als VITE_SUPABASE_ANON_KEY in de
-- frontend, zie agents.md) — dus prima direct in dit script, geen Vault nodig.
-- De 'x-digilab-secret'-waarde (METRICS_REPORT_SECRET) is wél een echt geheim en
-- hoort daarom via Supabase Vault, nooit als plain string in dit bestand.
--
-- Stap 1 — extensies inschakelen:
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- Stap 2 — secret opslaan in Supabase Vault (waarde moet gelijk zijn aan de
-- Edge Function secret METRICS_REPORT_SECRET, zie supabase/functions/metrics-rapportage):
--   SELECT vault.create_secret('<vul-hier-dezelfde-waarde-in-als-METRICS_REPORT_SECRET>', 'metrics_report_secret');
--
-- Stap 3 — vervang <project-ref> en <anon-key> hieronder door je eigen waarden
-- (Project Settings > API) en registreer de twee cron-jobs:
--
--   SELECT cron.schedule('digilab-metrics-wekelijks', '0 6 * * 1', $$
--     SELECT net.http_post(
--       url := 'https://<project-ref>.supabase.co/functions/v1/metrics-rapportage?type=wekelijks',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer <anon-key>',
--         'x-digilab-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'metrics_report_secret')
--       ),
--       body := '{}'::jsonb
--     );
--   $$);
--
--   SELECT cron.schedule('digilab-metrics-maandelijks', '0 6 1 * *', $$
--     SELECT net.http_post(
--       url := 'https://<project-ref>.supabase.co/functions/v1/metrics-rapportage?type=maandelijks',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer <anon-key>',
--         'x-digilab-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'metrics_report_secret')
--       ),
--       body := '{}'::jsonb
--     );
--   $$);
--
-- Controleren: SELECT * FROM cron.job; en SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;

-- ============================================================
-- Testdata (optioneel — verwijder in productie)
-- ============================================================
-- INSERT INTO materiaal (naam, type, qr_code, standaard_locatie, huidige_locatie, status)
-- VALUES
--   ('Chromebook Dell #1', 'Chromebook', 'item_test_001', 'Ermelo', 'Ermelo', 'beschikbaar'),
--   ('iPad Pro 12"',       'Tablet',     'item_test_002', 'Nunspeet', 'Nunspeet', 'beschikbaar'),
--   ('VR-bril Meta Quest', 'VR-bril',    'item_test_003', 'Ermelo', 'Ermelo', 'beschikbaar');
