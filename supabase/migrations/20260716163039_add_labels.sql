-- Labels-feature: vrij te beheren tags voor materiaal (bijv. Digitaal, Leesbevordering)

CREATE TABLE IF NOT EXISTS labels (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  naam            TEXT NOT NULL UNIQUE,
  kleur           TEXT,
  aangemaakt_op   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materiaal_labels (
  materiaal_id    UUID NOT NULL REFERENCES materiaal(id) ON DELETE CASCADE,
  label_id        UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (materiaal_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_materiaal_labels_materiaal ON materiaal_labels(materiaal_id);
CREATE INDEX IF NOT EXISTS idx_materiaal_labels_label ON materiaal_labels(label_id);

ALTER TABLE labels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiaal_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan labels zien en beheren" ON labels
  FOR ALL USING (true);

CREATE POLICY "Iedereen kan materiaal_labels zien en beheren" ON materiaal_labels
  FOR ALL USING (true);
