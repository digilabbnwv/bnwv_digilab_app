# Plan — Lesbrieven & digitale leerlijn

_Aangemaakt 2026-07-29. Uitgewerkt in overleg met Jasper. Status: ontwerp akkoord op hoofdlijnen, nog niet gebouwd. Zie ook BACKLOG.md._

## Doel

Beheerders kunnen volwaardige **lesbrieven** maken (gestructureerde inhoud + geüploade
bestanden + gekoppeld materiaal), lessen in een **serie** en een **thema** plaatsen, en per les
aangeven welke **kerndoelen** voor welke **jaargroep** op welk **niveau** aan bod komen. Een
gepubliceerde lesbrief verschijnt in het bestaande Lesplannen-overzicht. Een nieuwe
**leerlijn-pagina** toont visueel de dekking: kerndoelen × jaargroepen, ingekleurd naar diepgang,
inclusief hiaten. Dit **vervangt** de huidige upload-flow (het vrije `bestand_url`-veld).

## Uitgangspunt: veel bestaat al

- `lesplannen`-tabel + overzicht ([LesplannenOverzicht.jsx](../src/pages/LesplannenOverzicht.jsx))
  en detail/bewerk-pagina ([LesplanDetail.jsx](../src/pages/LesplanDetail.jsx)), beheerder-gated.
- Junction-tabellen bestaan al: `lesplan_materiaal`, `lesplan_doelgroepen`, `lesplan_kerndoelen`,
  `lesplan_labels`, `lesplan_workshops`.
- `doelgroepen` = vaste geordende lijst (Peuters, Groep 1-2 … VO 6). `kerndoelen` = officiële
  SLO-data (code/sector/vakgebied/domein).
- Echt file-upload-patroon bestaat al: `uploadFoto` in [onderhoud.js](../src/lib/onderhoud.js)
  → Supabase Storage bucket `fotos`. Hergebruiken.
- De huidige "upload" van een lesplan is alleen het vrije tekstveld `bestand_url` (externe link).
  Dát vervangen we.
- **Leerlijn** bestaat nog helemaal niet — dat is de echt nieuwe bouwsteen.

## Beslissingen (met Jasper, 2026-07-29)

1. **Volgorde** → genummerde **lessenserie** (niet paarsgewijze vorige/volgende-links).
2. **Thema** → eigen `themas`-tabel, los van de materiaal-`labels`.
3. **Diepgang** → niveau per kerndoel-koppeling: `kennismaking` / `verdieping` / `beheersing`.
4. **Meerdere lessen per cel** → binnen hetzelfde aanbod kunnen meerdere verschillende lessen
   hetzelfde kerndoel op hetzelfde niveau in dezelfde groep dekken. Een matrixcel is dus een
   **verzameling** lessen (telbadge/stapel + klik-door naar de lijst), niet één les.

## Datamodel

### Uitbreiding `lesplannen`
Nieuwe kolommen (Dutch, snake_case, conform schema-conventies):
- Inhoud: `lesduur_minuten INT`, `groepsgrootte TEXT`, `voorbereiding TEXT`,
  `benodigdheden TEXT` (naast de materiaal-koppeling), `lesverloop TEXT` (intro→kern→afsluiting;
  eventueel later gestructureerd als jsonb-stappen), `differentiatie TEXT`, `evaluatie TEXT`,
  `tips TEXT`.
- `leerdoelen` — **open beslissing**: los tabelletje `lesplan_leerdoelen(id, lesplan_id, tekst,
  volgorde)` (mooie ordening) vs. één lijstveld (`jsonb`/regel-per-doel). Start-advies: lijstveld,
  later normaliseren indien nodig.
- `status TEXT CHECK (status IN ('concept','gepubliceerd')) DEFAULT 'concept'`.
- `serie_id UUID REFERENCES lessenseries(id) ON DELETE SET NULL`, `serie_volgorde INT`.
- `thema_id UUID REFERENCES themas(id) ON DELETE SET NULL`.
- `bestand_url` uitfaseren (behouden tijdens migratie, daarna verwijderen).

### Nieuwe tabel `themas`
`id UUID PK`, `naam TEXT UNIQUE NOT NULL`, `kleur TEXT` (hex), `volgorde INT`, `aangemaakt_op`.

### Nieuwe tabel `lessenseries`
`id UUID PK`, `naam TEXT NOT NULL`, `omschrijving TEXT`, `thema_id UUID REFERENCES themas(id)
ON DELETE SET NULL`, `aangemaakt_op`. Lessen verwijzen terug via `lesplannen.serie_id` +
`serie_volgorde`.

### Nieuwe tabel `lesplan_bestanden`
`id UUID PK`, `lesplan_id UUID REFERENCES lesplannen(id) ON DELETE CASCADE`,
`bestand_url TEXT NOT NULL`, `bestandsnaam TEXT`,
`soort TEXT CHECK (soort IN ('presentatie','werkblad','handleiding','overig'))`,
`grootte_bytes INT`, `aangemaakt_op`.
Storage: nieuwe publieke bucket `lesmateriaal` (pad bv. `lesplannen/{lesplanId}/{ts}_{naam}`),
nieuwe lib-functie `uploadLesbestand` naar analogie van `uploadFoto`.

### Wijziging `lesplan_kerndoelen`
Kolom `diepgang TEXT CHECK (diepgang IN ('kennismaking','verdieping','beheersing'))` toevoegen.
NB: diepgang geldt per (lesplan × kerndoel). Een les kan aan meerdere doelgroepen hangen; dan
geldt hetzelfde niveau voor die groepen. **Open beslissing:** volstaat diepgang per
(kerndoel) of moet het per (kerndoel × groep)? Start-advies: per (lesplan × kerndoel).

### RLS
Conform bestaand patroon: RLS aan, policy `FOR ALL USING (true)`; beheerder-check in de app-laag.

## Schermen / UI

- **Authoring-formulier** — [LesplanDetail.jsx](../src/pages/LesplanDetail.jsx) uitbreiden tot
  meerdelig formulier: inhoud · leerdoelen · kerndoelen (+ diepgang-selectie per kerndoel) ·
  doelgroepen · materiaal · bestanden (upload/preview/verwijderen) · serie (+ volgorde) · thema ·
  concept-opslaan / publiceren.
- **[LesplannenOverzicht.jsx](../src/pages/LesplannenOverzicht.jsx)** — medewerkers zien alleen
  `gepubliceerd`; beheerders zien ook `concept` met badge. Extra filters: thema, serie.
- **Nieuwe `/leerlijn`-pagina** — dekkingsmatrix kerndoelen × jaargroepen, cellen ingekleurd naar
  diepgang (sequential blauw: kennismaking→beheersing), lege cel = geen aanbod. **Cel = meerdere
  lessen** (telbadge/stapel, klik → lijst → lesbrief). Filters: vakgebied, sector, thema.
  Mockup-referentie: zie gespreksartifact `leerlijn_dekkingsmatrix_mockup` (2026-07-29).
- **Serieweergave** — een serie als geordende reeks lessen tonen (op serie- of lesdetail).
- **Thema-beheer** — scherm analoog aan het bestaande labels-beheerscherm.
- Routing: authoring/thema-beheer onder `<BeheerderRoute>`; `/leerlijn` en overzicht onder
  `<ProtectedRoute>` (bekijken mag iedereen).

## Lib / mock

- `lesplannen.js` uitbreiden: inhoudsvelden, publiceren/depubliceren, serie-CRUD, thema-CRUD,
  bestanden (upload/list/delete), diepgang op kerndoel-koppeling, en
  `getLeerlijnMatrix({sector, vakgebied, thema})` die per (kerndoel, doelgroep) de lessen +
  hoogste/aanwezige diepgang aggregeert.
- **mockDB.js** volledig meespiegelen (nieuwe tabellen, junctions, seed + mock-functies) — elke
  nieuwe lib-functie heeft een `if (MOCK)`-pad. Seed enkele thema's, een serie (Micro:Bit
  basis→verdieping) en diepgang-voorbeelden zodat de matrix in mock-modus gevuld is.

## Migraties

Nieuwe timestamped migraties in `supabase/migrations/` + `supabase-schema.sql` bijwerken (source
of truth) + seed voor `themas`. Denk aan de les uit BACKLOG (2026-07-25): migraties moeten óók
in het live Supabase-project gedraaid worden, anders lijken overzichten leeg.

## Testen

- Vitest-units voor de nieuwe lib-logica (publiceren-gating, serie-ordening, matrix-aggregatie,
  diepgang).
- Playwright e2e: lesbrief maken → bestand uploaden → publiceren → verschijnt in overzicht →
  zichtbaar in leerlijn-matrix.
- Mock-modus end-to-end verifiëren in de browser vóór live.

## Fasering

- **Fase 1** — datamodel + authoring (inhoud, status, thema, serie, bestanden-upload) +
  overzicht-aanpassing. Vervangt de oude upload-flow.
- **Fase 2** — leerlijn-matrix + diepgang-visualisatie (`/leerlijn`), incl. meerdere-lessen-per-cel.

## Openstaande punten (bij de bouw samen bepalen)

1. Exacte set inhoudsvelden van een "goede lesbrief" (Jasper is domeineigenaar).
2. Opslag `leerdoelen`: los tabelletje vs. lijstveld.
3. Diepgang per (kerndoel) of per (kerndoel × groep).
4. Mag een les in meerdere series/thema's, of precies één? (Nu aangenomen: max één serie, één thema.)
