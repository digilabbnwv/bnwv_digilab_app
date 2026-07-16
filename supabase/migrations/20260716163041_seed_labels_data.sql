-- Data-migratie: labels aanmaken, bestaande producten labelen als 'Digitaal',
-- en de 11 Theaterlezen Leskisten toevoegen met het label 'Leesbevordering'.

-- 1. Labels aanmaken (idempotent)
INSERT INTO labels (naam, kleur) VALUES
  ('Digitaal', '#E8772E'),
  ('Leesbevordering', '#F59E0B')
ON CONFLICT (naam) DO NOTHING;

-- 2. Alle bestaande materiaal-items koppelen aan het label 'Digitaal'
INSERT INTO materiaal_labels (materiaal_id, label_id)
SELECT m.id, l.id
FROM materiaal m
CROSS JOIN labels l
WHERE l.naam = 'Digitaal'
ON CONFLICT DO NOTHING;

-- 3. De 11 Theaterlezen Leskisten toevoegen (locatie Nunspeet, aantal 1, type Leskist, prefix LEES)
INSERT INTO materiaal (naam, merk, type, categorie_prefix, qr_code, aantal, standaard_locatie, huidige_locatie, status) VALUES
  ('Theaterlezen Leskist 3-1 (begin)',       NULL, 'Leskist', 'LEES', 'BNWV-DIGI-LEES-0001', 1, 'Nunspeet', 'Nunspeet', 'beschikbaar'),
  ('Theaterlezen Leskist 3-2 (eind)',        NULL, 'Leskist', 'LEES', 'BNWV-DIGI-LEES-0002', 1, 'Nunspeet', 'Nunspeet', 'beschikbaar'),
  ('Theaterlezen Leskist 4-1 (begin)',       NULL, 'Leskist', 'LEES', 'BNWV-DIGI-LEES-0003', 1, 'Nunspeet', 'Nunspeet', 'beschikbaar'),
  ('Theaterlezen Leskist 4-2 (midden)',      NULL, 'Leskist', 'LEES', 'BNWV-DIGI-LEES-0004', 1, 'Nunspeet', 'Nunspeet', 'beschikbaar'),
  ('Theaterlezen Leskist 4-3 (eind)',        NULL, 'Leskist', 'LEES', 'BNWV-DIGI-LEES-0005', 1, 'Nunspeet', 'Nunspeet', 'beschikbaar'),
  ('Theaterlezen Leskist 5-1 (begin)',       NULL, 'Leskist', 'LEES', 'BNWV-DIGI-LEES-0006', 1, 'Nunspeet', 'Nunspeet', 'beschikbaar'),
  ('Theaterlezen Leskist 5-2 (midden/eind)', NULL, 'Leskist', 'LEES', 'BNWV-DIGI-LEES-0007', 1, 'Nunspeet', 'Nunspeet', 'beschikbaar'),
  ('Theaterlezen Leskist 6-1',               NULL, 'Leskist', 'LEES', 'BNWV-DIGI-LEES-0008', 1, 'Nunspeet', 'Nunspeet', 'beschikbaar'),
  ('Theaterlezen Leskist 6-2',               NULL, 'Leskist', 'LEES', 'BNWV-DIGI-LEES-0009', 1, 'Nunspeet', 'Nunspeet', 'beschikbaar'),
  ('Theaterlezen Leskist 6-3',               NULL, 'Leskist', 'LEES', 'BNWV-DIGI-LEES-0010', 1, 'Nunspeet', 'Nunspeet', 'beschikbaar'),
  ('Theaterlezen Leskist 7-1',               NULL, 'Leskist', 'LEES', 'BNWV-DIGI-LEES-0011', 1, 'Nunspeet', 'Nunspeet', 'beschikbaar')
ON CONFLICT (qr_code) DO NOTHING;

-- 4. De 11 nieuwe leskisten koppelen aan het label 'Leesbevordering'
INSERT INTO materiaal_labels (materiaal_id, label_id)
SELECT m.id, l.id
FROM materiaal m
CROSS JOIN labels l
WHERE l.naam = 'Leesbevordering'
  AND m.qr_code LIKE 'BNWV-DIGI-LEES-%'
ON CONFLICT DO NOTHING;
