# Backlog

Losse verbeterpunten en ideeën die (nog) niet direct opgepakt worden.
Nieuw punt? Voeg een regel toe met datum, korte omschrijving en eventuele notities.

## Open

- **2026-07-24 — QR-scan vóór inloggen springt naar home in plaats van naar het gescande item**
  Als je met de camera een QR-code scant terwijl je nog niet bent ingelogd, kom je na het
  inloggen op de homepage terecht in plaats van automatisch door te gaan naar de URL van de
  gescande QR-code.

- **2026-07-24 — Materiaal archiveren/verwijderen ontbreekt**
  Er is nu geen manier om materiaal te archiveren of te verwijderen. Archiveren heeft de
  voorkeur boven hard verwijderen (behoud van historie/transacties).

- **2026-07-24 — "Item niet gevonden" bij openen van materiaal**
  Vermoedelijke oorzaak: sinds de Lesplannen-feature (2026-07-24) haalt `ItemPagina.jsx` ook
  lesplannen op via `Promise.all`. Als de migraties in `supabase/migrations/20260724*.sql` nog
  niet zijn uitgevoerd in het live Supabase-project, bestaat de `lesplannen`-tabel daar nog
  niet, faalt die aanroep, en toont de generieke foutafhandeling "Item niet gevonden" — ook al
  bestaat het item wel. Snel te verifiëren/verhelpen door de migraties in de Supabase SQL
  Editor te draaien.

- **2026-07-24 — Responsive/desktop-indeling voor beheerders op laptop**
  Open vraag, nog geen besluit. Jasper werkt als beheerder vooral op laptop en zou graag meer
  schermruimte benut zien. Advies (zie gesprek 2026-07-24): geen aparte desktop-IA (hoge
  onderhoudslast, twee vormen om bij elke nieuwe pagina aan te denken), maar incrementele
  responsive-aanpassingen per pagina — vanaf een `lg:`-breakpoint de bottom-nav vervangen door
  een zijbalk en kaartenlijsten (Materiaal, Lesplannen, Workshops) in een grid van 2-3 kolommen
  i.p.v. gestapeld. Blijft dezelfde componenten/code, dus blijft vanzelf in sync met mobiel.

## Opgelost

_(nog leeg)_
