# Backlog

Losse verbeterpunten en ideeën die (nog) niet direct opgepakt worden.
Nieuw punt? Voeg een regel toe met datum, korte omschrijving en eventuele notities.

## Open

- **2026-07-24 — Responsive/desktop-indeling voor beheerders op laptop**
  Open vraag, nog geen besluit. Jasper werkt als beheerder vooral op laptop en zou graag meer
  schermruimte benut zien. Advies (zie gesprek 2026-07-24): geen aparte desktop-IA (hoge
  onderhoudslast, twee vormen om bij elke nieuwe pagina aan te denken), maar incrementele
  responsive-aanpassingen per pagina — vanaf een `lg:`-breakpoint de bottom-nav vervangen door
  een zijbalk en kaartenlijsten (Materiaal, Lesplannen, Workshops) in een grid van 2-3 kolommen
  i.p.v. gestapeld. Blijft dezelfde componenten/code, dus blijft vanzelf in sync met mobiel.

## Opgelost

- **2026-07-25 — QR-scan vóór inloggen springt naar home in plaats van naar het gescande item**
  Opgelost: `ProtectedRoute` geeft de oorspronkelijke locatie mee via `state.from` bij de
  redirect naar `/login`, en de login/registratie-routes in `App.jsx` sturen na inloggen naar
  die bestemming in plaats van hardcoded naar `/`. Zie [App.jsx](src/App.jsx).

- **2026-07-25 — Materiaal archiveren/verwijderen ontbreekt**
  Opgelost (archiveren, geen hard delete): nieuwe `gearchiveerd`-kolom op `materiaal`.
  Beheerders kunnen een item archiveren/herstellen vanaf de itempagina; gearchiveerd materiaal
  verdwijnt uit alle keuzelijsten maar blijft bereikbaar via QR/link, en is terug te vinden in
  het nieuwe archief-overzicht (`/materiaal/archief`).

- **2026-07-25 — "Item niet gevonden" bij openen van materiaal (en later ook: leeg materiaal-,
  lesplannen- en reserveringen-overzicht op de live app)**
  Oorzaak bevestigd: de migraties voor de Lesplannen-feature en materiaal-archivering
  (`supabase/migrations/20260724*.sql` en `20260725090000_add_materiaal_archivering.sql`)
  waren nog niet uitgevoerd in het live Supabase-project. Omdat `getAllMateriaal()` op meerdere
  pagina's samen met andere data in één `Promise.all` wordt opgehaald (bijv.
  [ReserverenPagina.jsx:137](src/pages/ReserverenPagina.jsx:137)), deed één ontbrekende kolom
  meerdere pagina's tegelijk leeg lijken. Opgelost door de vier migraties alsnog handmatig in de
  Supabase SQL Editor te draaien — bevestigd werkend op de live app.
