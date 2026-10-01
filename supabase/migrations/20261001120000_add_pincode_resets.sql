-- Pincode vergeten: eenmalige resettokens.
--
-- De Edge Function `pincode-reset` maakt per aanvraag een willekeurig token aan,
-- mailt de link naar de medewerker en slaat hier alleen de SHA-256-hash van het
-- token op. Een token is 1 uur geldig en kan maar één keer gebruikt worden.
--
-- RLS staat aan zonder policies: alleen de service-role (Edge Function) kan deze
-- tabel lezen of schrijven. De app (anon-key) heeft er geen toegang toe.
CREATE TABLE IF NOT EXISTS pincode_resets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medewerker_id   UUID NOT NULL REFERENCES medewerkers(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  aangemaakt_op   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verloopt_op     TIMESTAMPTZ NOT NULL,
  gebruikt_op     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pincode_resets_medewerker ON pincode_resets (medewerker_id);

ALTER TABLE pincode_resets ENABLE ROW LEVEL SECURITY;
