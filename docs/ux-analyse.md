# UX-analyse — Digilab App (dagelijkse medewerker-flows)

*Heuristische evaluatie vanuit de rol van senior interaction designer.*
*Scope: inloggen, dashboard, materiaal zoeken/scannen, meenemen/terugbrengen, reserveren, melden, profiel.
Beheer-/workshopschermen vallen buiten scope.*
*Nadruk: eerste-keer-gebruik + consistentie & vertrouwen.*
*Datum: 25-06-2026.*

---

## 1. Samenvatting

De app oogt verzorgd en doordacht: mooie kaarten, vriendelijke lege staten, een slimme
beschikbaarheidsindicator en een nette mobiele bottom-sheet. De basis is goed. De grootste winst zit niet
in *meer* maken, maar in **scherper en consistenter** maken — zodat een collega die de app voor het eerst
opent meteen de weg vindt, en de app over alle schermen heen "af" en betrouwbaar aanvoelt.

### Top-5 bevindingen
1. 🔴 **QR-scannen — de kerntaak — heeft geen vindbare ingang** (geen scanknop in navigatie of op het dashboard).
2. 🔴 **Technische foutmeldingen lekken naar de gebruiker** (ruwe `JSON.stringify` van fouten in beeld).
3. 🟠 **Eén taak, twee verschillende flows:** "meenemen" werkt anders op het dashboard dan op de itempagina.
4. 🟠 **Primaire en accent-kleur zijn vrijwel dezelfde oranje** → visuele hiërarchie valt weg.
5. 🟠 **Inconsistente bevestiging & feedback:** native `confirm()`-dialoog naast nette modals; succesmelding
   verschilt per scherm.

### Aanbevolen quick wins vóór de livegang
Hoog effect, lage inspanning — samen een dag werk:
- Nette, begrijpelijke foutmeldingen i.p.v. ruwe fout-objecten (**F6**).
- `window.confirm()` vervangen door de bestaande `Modal` (**F8**).
- Eén term kiezen ("materiaal") en overal doorvoeren (**F5**).
- Scanknop toevoegen aan dashboard + bottomnav (**F1**).
- `text-muted` op kleine tekst donkerder maken voor leesbaar contrast (**F12**).

---

## 2. Wat al goed is (behouden)

Belangrijk om te benoemen — dit is het fundament waarop de verbeteringen voortbouwen:

- **Lege staten zijn vriendelijk en menselijk** ("Alles is op orde ✨", "Geen openstaande meldingen 🎉").
  Dit verlaagt de drempel en voorkomt verwarring bij een leeg scherm.
- **Beschikbaarheidsindicator** op de itempagina (komende 14 dagen) is een sterke, contextuele hulp die
  reserveringsconflicten vóór is.
- **Mobiele modal als bottom-sheet** met sleep-handle ([Modal.jsx:20](../src/components/Modal.jsx)) volgt
  de native verwachting op telefoon — goede keuze.
- **Reserveringskalender met gekleurde puntjes + legenda** geeft in één oogopslag overzicht.
- **Contextbewuste meenemen-flow** (eigen reservering / vrij / conflict met collega) toont dat er goed is
  nagedacht over de echte situatie op de werkvloer.
- **Pincode-invoer** met auto-focus, plak-ondersteuning en per-cijfer velden is prettig op mobiel.

---

## 3. Bevindingen

Ernst: 🔴 hoog · 🟠 midden · 🟢 laag. Inschatting: S (< 0,5 dag) · M (0,5–1 dag) · L (> 1 dag).

### A. Vindbaarheid & navigatie

#### F1 🔴 QR-scannen heeft geen vindbare ingang — *S, quick win*
De app draait om QR-codes op leskisten, maar er is **geen scanknop** in de bottomnav
([BottomNav.jsx:5](../src/components/BottomNav.jsx)) of op het dashboard. De route `/item/scan` bestaat,
maar leidt naar een pagina die alleen *uitlegt* "gebruik de camera-app van je telefoon"
([ItemPagina.jsx:187](../src/pages/ItemPagina.jsx)) — er is geen daadwerkelijke scanner in de app.
Een nieuwe gebruiker die "scannen" als de hoofdhandeling verwacht, vindt geen knop.

**Voorstel:** Voeg een prominente **scanknop** toe (dashboard-snelknop én/of centrale knop in de bottomnav).
Overweeg een echte in-app scanner (camera + QR-decoder, bv. `html5-qrcode`) zodat scannen binnen de app
gebeurt i.p.v. via de losse camera-app. Quick win = de knop + verwijzing; de in-app scanner is een aparte M/L.

#### F2 🟠 Meldingenoverzicht is slecht vindbaar — *S*
Het meldingenoverzicht (`/melding`) staat niet in de bottomnav. Het is alleen te bereiken via het dashboard
(en alleen als er meldingen zijn) of via een individueel item. Wie het totaaloverzicht wil, moet het toevallig
tegenkomen.

**Voorstel:** Geef meldingen een vaste plek — bv. een item in de bottomnav of een altijd-zichtbare tegel op
het dashboard met een teller (badge) bij openstaande meldingen.

#### F3 🟠 Eén taak, twee verschillende flows ("meenemen") — *M*
"Materiaal meenemen" werkt op twee plekken verschillend:
- **Dashboard:** "Nu meenemen" opent een modal waarin je materiaal kiest uit een **dropdown**, daarna context,
  daarna pincode ([Dashboard.jsx:308](../src/pages/Dashboard.jsx)).
- **Itempagina:** een **knop** "Meenemen" met een eigen, deels gedupliceerde context-UI
  ([ItemPagina.jsx:398](../src/pages/ItemPagina.jsx)).

Twee mentale modellen voor dezelfde handeling verhogen de leerlast en het onderhoudsrisico (de
reserveringscontext-UI staat nu dubbel).

**Voorstel:** Trek de meenemen-flow samen in één herbruikbare component die op beide plekken wordt gebruikt.
Op het dashboard leidt "Nu meenemen" idealiter naar scannen/zoeken → itempagina, zodat er één pad is.

### B. Taal & terminologie

#### F5 🟠 Wisselende termen voor hetzelfde ding — *S, quick win*
Hetzelfde object heet door de app heen "item", "materiaal" én "product" (bv. label **"Product *"** in de
reserveermodal, [ReserverenPagina.jsx:437](../src/pages/ReserverenPagina.jsx), tegenover "materiaal" en "item"
elders). Dat ondermijnt herkenning en oogt slordig.

**Voorstel:** Kies één term — **"materiaal"** sluit aan bij de bottomnav en de domeintaal — en voer die
consequent door in labels, knoppen en placeholders.

### C. Feedback & foutafhandeling

#### F6 🔴 Technische foutmeldingen lekken naar de gebruiker — *S, quick win*
Bij een fout tijdens meenemen/terugbrengen wordt het ruwe foutobject getoond:
`Fout bij meenemen: ${err.message || err.details || JSON.stringify(err)}`
([ItemPagina.jsx:114](../src/pages/ItemPagina.jsx), ook regel 147/167). Een eindgebruiker ziet zo
JSON of database-taal — dat oogt stuk en onbetrouwbaar, precies tegen je doel "vertrouwen".

**Voorstel:** Toon een korte, menselijke melding ("Meenemen lukte niet — probeer het opnieuw of meld het bij
de beheerder.") en log het technische detail naar de console. Eventueel één gedeelde helper die fouten naar
nette NL-teksten vertaalt.

#### F7 🟠 Inconsistente succes-feedback — *M*
Na een geslaagde actie verschilt de terugkoppeling per scherm:
- Itempagina: groene **inline banner** ("Item succesvol meegenomen!").
- Melden: **fullscreen** bevestiging met automatische redirect na 2s ([OnderhoudMelden.jsx:93](../src/pages/OnderhoudMelden.jsx)).
- Dashboard/Meldingen: modal **sluit gewoon**, zonder expliciete bevestiging.

Voor een voorspelbare, betrouwbare indruk hoort succes overal op dezelfde manier te voelen.

**Voorstel:** Kies één feedbackpatroon (bv. een korte toast/banner met een ✓) en gebruik dat overal. Er is al
een `SuccesBericht`-component ([UI.jsx:60](../src/components/UI.jsx)) die hiervoor de basis kan zijn.

#### F8 🟠 Native `confirm()` botst met de app — *S, quick win*
Annuleren van een reservering gebruikt `window.confirm(...)`
([ReserverenPagina.jsx:232](../src/pages/ReserverenPagina.jsx)). Dat is een kale browser-dialoog die niet
meekleurt met het (dark) thema en de zorgvuldig opgebouwde stijl doorbreekt — terwijl er al een mooie
`Modal` is.

**Voorstel:** Vervang door een bevestigings-`Modal` in de huisstijl (met "Annuleren" / "Ja, verwijderen").

### D. Visuele hiërarchie & consistentie

#### F9 🟠 Primaire en accent-kleur zijn vrijwel identiek — *M*
`primary = #E8772E` en `accent = #F59E0B` zijn beide oranje en liggen heel dicht bij elkaar
([tailwind.config.js:17](../tailwind.config.js)). Daardoor verdwijnt het onderscheid tussen "primaire actie"
en "accent-actie". Op het dashboard hebben "Reserveren" (primary) en "Nu meenemen" (accent) daardoor bijna
dezelfde kleur, terwijl de hiërarchie juist verschil zou moeten tonen.

**Voorstel:** Geef accent een duidelijk andere tint dan de oranje primary (of definieer accent juist voor één
specifieke rol, bv. "onderhoud/let op"). Leg vast wanneer welke kleur hoort — één betekenis per kleur.
*Let op: mijn projectnotitie zei "primary = paars (#7C3AED)"; de code is inmiddels oranje. Even afstemmen wat
de bedoelde merkkleur is.*

### E. Frictie & efficiëntie

#### F10 🟠 Pincode bij élke actie — *M (vooral een ontwerpbeslissing)*
Meenemen, terugbrengen, melden én een melding sluiten vragen telkens om de 5-cijferige pincode
(o.a. [ItemPagina.jsx:535](../src/pages/ItemPagina.jsx), [OnderhoudMelden.jsx:209](../src/pages/OnderhoudMelden.jsx),
[MeldingenOverzicht.jsx:189](../src/pages/MeldingenOverzicht.jsx)). De gebruiker is al ingelogd; de pincode
voegt voor laagrisico-handelingen vooral frictie toe — juist op een telefoon, juist bij dagelijks gebruik.

**Voorstel:** Maak de afweging expliciet. Opties: pincode alléén vragen bij gevoelige/onomkeerbare acties
(overnemen van een collega, melding sluiten), of een korte "bevestigd"-periode (bv. 5 min) waarin niet opnieuw
gevraagd wordt. Dit raakt beveiliging — graag samen bepalen.

#### F11 🟢 Lange dropdown zonder zoek — *M*
Materiaal kiezen gebeurt via een native `<select>` met mogelijk 30+ items (reserveren, melden, "nu meenemen").
Op een telefoon is door zo'n lijst scrollen omslachtig.

**Voorstel:** Een zoekbare keuzelijst (type-ahead), of het materiaal vooraf bepalen via scannen/itempagina
zodat de keuze meestal al gemaakt is.

### F. Toegankelijkheid & touch (raakt eerste-keer-gebruik en leesbaarheid)

#### F12 🟠 Te laag tekstcontrast op `text-muted` — *S, quick win*
`text-muted` wordt veel gebruikt voor kleine tekst (12px: meta-info, hints, tellers). Het contrast met de
kaartachtergrond haalt WCAG AA (4,5:1 voor kleine tekst) niet:
- Licht thema: `#94A3B8` op wit ≈ **2,6:1**.
- Donker thema: `#64748B` op `#162235` ≈ **3,4:1**.

Voor een diverse personeelsgroep (en oudere ogen) is dit lastig leesbaar.

**Voorstel:** Maak `text-muted` iets donkerder (licht thema) / lichter (donker thema) tot ≥ 4,5:1, of gebruik
`text-secondary` voor informatie die er echt toe doet. Klein in de tokens, breed effect.

#### F13 🟢 Touch-targets onder 44px — *S*
Enkele belangrijke bedien-elementen zijn kleiner dan de aanbevolen 44×44px: de tekstlink "Liever ad-hoc
meenemen" ([ItemPagina.jsx:459](../src/pages/ItemPagina.jsx)), de prullenbak-annuleerknop (`p-2` ≈ 32px,
[ReserverenPagina.jsx:607](../src/pages/ReserverenPagina.jsx)) en de oog-toggle bij de pincode.

**Voorstel:** Vergroot het aanraakgebied (meer padding of `min-h-[44px]`), zonder het visuele formaat per se
te vergroten.

### G. Foutpreventie

#### F14 🟢 Modal sluit bij backdrop-klik, ook met half-ingevuld formulier — *S*
De `Modal` sluit bij elke klik op de achtergrond ([Modal.jsx:14](../src/components/Modal.jsx)). Bij de
reserveer- en meldingformulieren betekent één misklik naast de modal: alles kwijt, zonder waarschuwing.

**Voorstel:** Voor formuliermodals het sluiten-bij-backdrop uitzetten of een "Weet je het zeker?"-tussenstap
tonen wanneer er al iets is ingevuld.

#### F15 🟢 Pincode wordt automatisch ingediend bij het 5e cijfer — *S*
`PincodeInvoer` verstuurt automatisch zodra het 5e cijfer is getypt ([PincodeInvoer.jsx:20](../src/components/PincodeInvoer.jsx)).
Snel, maar bij een typefout is er geen moment om te corrigeren vóór verzending; de gebruiker ziet alleen een
foutmelding.

**Voorstel:** Acceptabel om te houden, maar overweeg een korte zichtbare bevestigingsstap of een duidelijke
"foutieve pincode, probeer opnieuw"-reset die het veld direct leegmaakt en focust.

---

## 4. Prioriteitsmatrix (effect × inspanning)

| | **Lage inspanning** | **Hogere inspanning** |
|---|---|---|
| **Hoog effect** | F6 nette foutmeldingen · F8 confirm→Modal · F5 één term · F12 contrast · **F1 scanknop** | F1 in-app scanner · F3 meenemen-flow samenvoegen · F7 uniforme feedback · F9 kleurhiërarchie |
| **Lager effect** | F13 touch-targets · F14 backdrop · F15 pin-reset | F2 meldingen in nav · F10 pincode-strategie · F11 zoekbare keuzelijst |

**Doen vóór de livegang (linksboven):** F6, F8, F5, F12 en de scanknop-variant van F1. Samen ± 1 dag werk en
ze tillen de "af"-indruk en vindbaarheid direct omhoog.

---

## 5. Voorgestelde vervolgstappen

1. **Quick-win-ronde (± 1 dag):** F6, F8, F5, F12, F1 (scanknop). Direct zichtbaar resultaat vóór de livegang.
2. **Consistentieronde:** F7 (uniforme feedback) + F9 (kleurhiërarchie) — vergt eerst een korte ontwerpkeuze
   (merkkleur, één feedbackpatroon).
3. **Flow-ronde:** F3 (meenemen samenvoegen) + F1 (echte in-app scanner) + F11 (zoekbare keuzelijst).
4. **Beleidskeuze:** F10 (pincode-strategie) — samen bepalen, want het raakt beveiliging.

Zeg welke ronde(s) je wilt oppakken, dan zet ik de gekozen verbeteringen om in concrete wijzigingen.
