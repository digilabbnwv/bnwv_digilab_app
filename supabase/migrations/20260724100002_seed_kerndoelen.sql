-- Seed: kerndoelen Digitale geletterdheid en Burgerschap (definitieve
-- conceptkerndoelen, gepubliceerd door SLO in 2025 — nog niet wettelijk
-- verplicht, maar scholen mogen er sinds schooljaar 2025-2026 al mee werken).
--
-- Bronnen (geraadpleegd juli 2026):
--   - https://www.schoolblocks.nl/blog/slo-digitale-geletterdheid
--     (domeinstructuur + subaspecten digitale geletterdheid, po + vo)
--   - https://www.slo.nl/sectoren/po/burgerschap-po/onderwijsdoelen/
--     (domeinstructuur burgerschap)
--   - https://www.slo.nl/thema/meer/actualisatie-kerndoelen-examenprogramma/actualisatie-kerndoelen/
--
-- LET OP — scope van deze seed:
--   - Digitale geletterdheid (po + vo): domeinen èn subaspecten (A/B/C/D) zijn
--     via een leesbare bron geverifieerd, inclusief de kerndoel-nummering.
--   - Burgerschap (po + vo): alleen de 3 hoofddomeinen zijn geverifieerd; de
--     officiële kerndoel-nummers en de tekst per subaspect stonden alleen in
--     grafisch opgemaakte PDF-bundels die niet betrouwbaar te extraheren waren.
--     De code-kolom is daarom een voorlopig label (BUR-*), geen officieel
--     kerndoelnummer — vervang dit zodra de kerndoelenbundel-tekst beschikbaar is.
--   - so/vso: bewust nog NIET geseed. Voor burgerschap so/vso bestaan aparte
--     "functionele kerndoelen" (andere insteek dan po/vo, gericht op
--     zelfredzaamheid/arbeidstoeleiding) waarvan de inhoud niet kon worden
--     geverifieerd — die vraagt een eigen zorgvuldige seed-stap zodra de
--     brontekst beschikbaar is (schema ondersteunt dit al via sector so/vso).
--   - Overige vakgebieden (rekenen, taal, etc.): nog niet geseed, lagere
--     prioriteit voor een digilab-context; kan later zonder schema-wijziging.

-- ── Digitale geletterdheid — po ──────────────────────────────
INSERT INTO kerndoelen (code, sector, vakgebied, domein, omschrijving) VALUES
  ('22A', 'po', 'Digitale geletterdheid', 'Praktische kennis en vaardigheden', 'Digitale systemen — functioneel inzetten van digitale systemen'),
  ('22B', 'po', 'Digitale geletterdheid', 'Praktische kennis en vaardigheden', 'Digitale media en informatie — doelgericht navigeren in het digitale media- en informatielandschap'),
  ('22C', 'po', 'Digitale geletterdheid', 'Praktische kennis en vaardigheden', 'Data — verkennen van data en dataverwerking'),
  ('22D', 'po', 'Digitale geletterdheid', 'Praktische kennis en vaardigheden', 'Artificiële intelligentie (AI) — verkennen van AI'),
  ('23A', 'po', 'Digitale geletterdheid', 'Ontwerpen en maken', 'Creëren met digitale technologie — passende werkwijzen bij het creëren van verschillende digitale producten'),
  ('23B', 'po', 'Digitale geletterdheid', 'Ontwerpen en maken', 'Programmeren — programmeren van computerprogramma''s met computationele denkstrategieën'),
  ('24A', 'po', 'Digitale geletterdheid', 'De gedigitaliseerde wereld', 'Veiligheid en privacy — veilig omgaan met digitale systemen en data'),
  ('24B', 'po', 'Digitale geletterdheid', 'De gedigitaliseerde wereld', 'Digitale technologie, jezelf en de ander — weloverwogen keuzes maken bij digitaal mediagebruik'),
  ('24C', 'po', 'Digitale geletterdheid', 'De gedigitaliseerde wereld', 'Digitale technologie en samenleving — verkennen van de wederzijdse beïnvloeding tussen digitale technologie en samenleving')
ON CONFLICT DO NOTHING;

-- ── Digitale geletterdheid — vo (onderbouw) ──────────────────
INSERT INTO kerndoelen (code, sector, vakgebied, domein, omschrijving) VALUES
  ('21A', 'vo', 'Digitale geletterdheid', 'Praktische kennis en vaardigheden', 'Digitale systemen — functioneel inzetten van digitale systemen'),
  ('21B', 'vo', 'Digitale geletterdheid', 'Praktische kennis en vaardigheden', 'Digitale media en informatie — doelgericht navigeren in het digitale media- en informatielandschap'),
  ('21C', 'vo', 'Digitale geletterdheid', 'Praktische kennis en vaardigheden', 'Data — verkennen van data en dataverwerking'),
  ('21D', 'vo', 'Digitale geletterdheid', 'Praktische kennis en vaardigheden', 'Artificiële intelligentie (AI) — verkennen van mogelijkheden en beperkingen van AI'),
  ('22A', 'vo', 'Digitale geletterdheid', 'Ontwerpen en maken', 'Creëren met digitale technologie — passende werkwijzen bij het creëren van verschillende digitale producten'),
  ('22B', 'vo', 'Digitale geletterdheid', 'Ontwerpen en maken', 'Programmeren — programmeren van computerprogramma''s met computationele denkstrategieën'),
  ('23A', 'vo', 'Digitale geletterdheid', 'De gedigitaliseerde wereld', 'Veiligheid en privacy — veilig omgaan met digitale systemen en data'),
  ('23B', 'vo', 'Digitale geletterdheid', 'De gedigitaliseerde wereld', 'Digitale technologie, jezelf en de ander — weloverwogen keuzes maken bij digitaal mediagebruik'),
  ('23C', 'vo', 'Digitale geletterdheid', 'De gedigitaliseerde wereld', 'Digitale technologie en samenleving — analyseren van de wederzijdse beïnvloeding tussen digitale technologie en samenleving')
ON CONFLICT DO NOTHING;

-- ── Burgerschap — po (domeinniveau; codes zijn voorlopig, zie opmerking bovenaan) ──
INSERT INTO kerndoelen (code, sector, vakgebied, domein, omschrijving) VALUES
  ('BUR-PO-1', 'po', 'Burgerschap', 'Jezelf en de ander', 'Verkennen, beschrijven en ervaren van jezelf in relatie tot de ander'),
  ('BUR-PO-2', 'po', 'Burgerschap', 'Samenleven in een democratische rechtsstaat', 'Verkennen, beschrijven en ervaren van samenleven in een democratische rechtsstaat'),
  ('BUR-PO-3', 'po', 'Burgerschap', 'Vormgeven aan democratische en maatschappelijke betrokkenheid', 'Verkennen, beschrijven en ervaren van democratische en maatschappelijke betrokkenheid')
ON CONFLICT DO NOTHING;

-- ── Burgerschap — vo (onderbouw; domeinniveau, codes voorlopig) ──
INSERT INTO kerndoelen (code, sector, vakgebied, domein, omschrijving) VALUES
  ('BUR-VO-1', 'vo', 'Burgerschap', 'Jezelf en de ander', 'Inzicht tonen in, herkennen en reflecteren op jezelf in relatie tot de ander'),
  ('BUR-VO-2', 'vo', 'Burgerschap', 'Samenleven in een democratische rechtsstaat', 'Inzicht tonen in, herkennen en reflecteren op samenleven in een democratische rechtsstaat'),
  ('BUR-VO-3', 'vo', 'Burgerschap', 'Vormgeven aan democratische en maatschappelijke betrokkenheid', 'Inzicht tonen in, herkennen en reflecteren op democratische en maatschappelijke betrokkenheid')
ON CONFLICT DO NOTHING;
