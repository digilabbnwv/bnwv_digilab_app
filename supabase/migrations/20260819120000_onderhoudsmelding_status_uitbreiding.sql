-- Onderhoudsmeldingen: statusmodel uitbreiden van binair (open/opgelost)
-- naar drie fasen, plus ondersteuning voor doorlooptijdanalyse.
--
-- Nieuw statusmodel:
--   nieuw          = zojuist gemeld, nog niet opgepakt
--   in_behandeling = iemand is er mee bezig
--   afgerond       = opgelost/afgehandeld (voorheen 'opgelost')
--
-- Bestaande data wordt gemigreerd: 'open' -> 'nieuw', 'opgelost' -> 'afgerond'.

-- 1. Nieuwe kolom voor doorlooptijdanalyse (moment van 'in behandeling' nemen).
ALTER TABLE onderhoudsmeldingen
  ADD COLUMN IF NOT EXISTS tijdstip_in_behandeling TIMESTAMPTZ;

-- 2. Oude status-constraint weg, data migreren, default + nieuwe constraint zetten.
--    Data moet gemigreerd zijn vóór de nieuwe CHECK, anders faalt die op oude waarden.
ALTER TABLE onderhoudsmeldingen DROP CONSTRAINT IF EXISTS onderhoudsmeldingen_status_check;
ALTER TABLE onderhoudsmeldingen ALTER COLUMN status DROP DEFAULT;

UPDATE onderhoudsmeldingen SET status = 'nieuw'    WHERE status = 'open';
UPDATE onderhoudsmeldingen SET status = 'afgerond' WHERE status = 'opgelost';

ALTER TABLE onderhoudsmeldingen ALTER COLUMN status SET DEFAULT 'nieuw';
ALTER TABLE onderhoudsmeldingen ADD CONSTRAINT onderhoudsmeldingen_status_check
  CHECK (status IN ('nieuw', 'in_behandeling', 'afgerond'));

-- 3. type_melding 'anders' toestaan. De UI (OnderhoudMelden) bood dit type al aan,
--    maar de oorspronkelijke CHECK-constraint weigerde het in productie.
ALTER TABLE onderhoudsmeldingen DROP CONSTRAINT IF EXISTS onderhoudsmeldingen_type_melding_check;
ALTER TABLE onderhoudsmeldingen ADD CONSTRAINT onderhoudsmeldingen_type_melding_check
  CHECK (type_melding IN ('kapot', 'mist', 'verbruiksmateriaal', 'anders'));
