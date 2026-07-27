-- Voeg de status 'teruggebracht' toe aan reserveringen.
--
-- Achtergrond: tot nu toe was de levenscyclus van een reservering onvolledig.
-- 'opgehaald' werd behandeld als eindstatus, terwijl het het middenpunt is:
--   actief -> opgehaald (materiaal opgehaald, loopt nog) -> teruggebracht (afgerond)
-- Terugbrengen (inchecken) zette de reservering nergens op af, waardoor een
-- opgehaalde reservering voorgoed uit alle overzichten verdween.
--
-- Vanaf nu:
--   actief         = gereserveerd, nog niet opgehaald
--   opgehaald      = opgehaald, loopt nog (blijft zichtbaar in de overzichten)
--   teruggebracht  = afgerond na inchecken/overrule (naar archief)
--   geannuleerd    = geannuleerd vóór gebruik (naar archief)

ALTER TABLE reserveringen DROP CONSTRAINT IF EXISTS reserveringen_status_check;

ALTER TABLE reserveringen ADD CONSTRAINT reserveringen_status_check
  CHECK (status IN ('actief', 'geannuleerd', 'opgehaald', 'teruggebracht'));
