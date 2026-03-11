# Digilab App — Projectbrief
**Bibliotheek Noordwest Veluwe · Versie 1.0 · Maart 2026**

---

## 1. Projectoverzicht

| Veld | Waarde |
|---|---|
| Opdrachtgever | Bibliotheek Noordwest Veluwe |
| Locaties | Ermelo en Nunspeet |
| Applicatienaam | Digilab App |
| Type | Progressive Web App (PWA) — mobile-first |
| Primaire gebruiker | Medewerkers van de bibliotheek |
| Doel | Materiaal beheren in het Digilab: locatie, beschikbaarheid, onderhoud |
| Bouwtool | Google Antigravity |
| Stack | React + Tailwind CSS + Supabase + GitHub + GitHub Pages |
| Budget infrastructuur | Gratis (Supabase free tier + GitHub Pages) |
| Fase | MVP — zo snel mogelijk werkend |

---

## 2. Probleemstelling

Medewerkers van het Digilab krijgen regelmatig de volgende vragen:

- Waar is materiaal nu?
- Waar moet ik materiaal terugzetten?
- Er is iets kapot of er mist iets — waar kan ik dit melden?

Er is momenteel geen centraal systeem om dit bij te houden. De Digilab App lost dit op door een eenvoudige, mobiele tool te bieden waarmee medewerkers materiaal kunnen in- en uitchecken, locaties bijhouden en onderhoudsmeldingen aanmaken.

---

## 3. Gebruikers & Toegang

### 3.1 Registratie
Medewerkers registreren eenmalig met naam, e-mailadres en een zelfgekozen 5-cijferige pincode. Er zijn geen rollen of hiërarchieën — alle medewerkers hebben gelijke toegang.

### 3.2 Inloggen
Inloggen gebeurt via pincode. Laagdrempelig en snel op smartphone. De pincode wordt gehasht opgeslagen in Supabase (nooit als plaintext).

### 3.3 Auditlog
Alle acties worden gelogd (wie, wat, wanneer, waar) voor auditdoeleinden. Er is geen beheerdersscherm in de MVP, maar de data is beschikbaar in Supabase voor handmatige controle.

---

## 4. Kernfunctionaliteiten MVP

### 4.1 QR-scanpagina (hart van de app)

Na het scannen van een QR-code op een item ziet de medewerker direct de itemkaart met alle relevante informatie en twee acties.

**Itemkaart toont:**
- Naam en type van het item
- Status: Beschikbaar of In gebruik
- Huidige medewerker (indien uitgecheckt)
- Huidige locatie (indien beschikbaar)
- Wie het item het laatst heeft gehad (+ datum)
- Openstaande onderhoudsmeldingen (indien aanwezig, met waarschuwingssymbool ⚠️)

**Twee knoppen:**
- `MEENEMEN`
- `TERUGBRENGEN`

---

### 4.2 Uitchecken (Meenemen)

1. Medewerker tikt op **MEENEMEN**
2. Voer 5-cijferige persoonlijke code in
3. ✅ Bevestigd — item staat op naam van de medewerker

Geen reden of extra informatie vereist. De actie wordt gelogd met naam, tijdstip en vorige locatie.

**Waarschuwing bij openstaande onderhoudsmelding:**

```
⚠️ Dit item heeft een openstaande onderhoudsmelding.
Weet je zeker dat je het wilt meenemen?

[ Annuleren ]   [ Ja, meenemen ]
```

---

### 4.3 Inchecken (Terugbrengen)

1. Medewerker tikt op **TERUGBRENGEN**
2. Voer 5-cijferige persoonlijke code in
3. Kies locatie — **Ermelo** of **Nunspeet**
4. ✅ Bevestigd — item is beschikbaar op gekozen locatie

Als het item op een andere locatie wordt ingeleverd dan waar het vandaan kwam, wordt dit automatisch gelogd als locatiewijziging.

---

### 4.4 Overrulen (collega brengt terug)

Als een medewerker een item terugbrengt dat op naam staat van een collega, toont de app een extra bevestigingsscherm:

```
⚠️ Dit item is uitgecheckt door [naam collega].
Weet je zeker dat jij het terugbrengt?

[ Annuleren ]   [ Ja, ik breng het terug ]
```

De actie wordt gelogd als overrule, inclusief beide namen.

---

### 4.5 Automatische reminder

Na 7 dagen zonder inchecken ontvangt de medewerker automatisch een e-mail via Resend.com:

```
Onderwerp: Vergeten terug te brengen?

Hey [naam], je hebt [item] al 7 dagen.
Vergeten terug te brengen?
```

---

### 4.6 Onderhoudsmelding

Twee instappunten: via de QR-scanpagina van een item, of via een snelknop op het dashboard.

1. **Item selecteren** — via QR-scan of zoeken
2. **Kies type melding:**
   - Iets is kapot
   - Onderdeel of accessoire mist
   - Verbruiksmateriaal op (batterijen, kabels etc.)
3. **Toelichting** (vrije tekst, optioneel) + **foto** (optioneel)
4. **Bevestig met persoonlijke code**

Meldingen zijn zichtbaar voor alle medewerkers. Een melding wordt gesloten door een medewerker die aangeeft dat het opgelost is (+ optionele notitie + persoonlijke code). Gesloten meldingen blijven zichtbaar in de historie van het item.

---

### 4.7 Dashboard

- Snel overzicht: wat is uitgecheckt, wat staat waar
- Openstaande onderhoudsmeldingen (alle locaties)
- Snelknoppen: Scan QR / Melding maken

---

### 4.8 Materiaaloverzicht

Lijst van alle items met zoek- en filterfunctie. Per item zichtbaar:

- Naam, type, unieke QR-code
- Status (beschikbaar / in gebruik / in onderhoud)
- Huidige locatie of huidige medewerker
- Koppeling naar lesbrief (URL)
- Gebruikshistorie en onderhoudshistorie

---

### 4.9 Mijn profiel

- Naam en pincode wijzigen
- Eigen uitleen- en actiehistorie

---

## 5. Statusmodel Materiaal

| Status | Locatie | Huidige medewerker | Laatst gebruikt door |
|---|---|---|---|
| In gebruik | n.v.t. | Jasper Geertsma | n.v.t. |
| Beschikbaar | Ermelo | n.v.t. | Jasper Geertsma (12 jan 2026) |

---

## 6. Technische Specificaties

### 6.1 Stack

| Onderdeel | Keuze | Reden |
|---|---|---|
| Bouwtool | Google Antigravity | Agent-first IDE, gratis, Gemini 3 Pro + Claude |
| Database & Auth | Supabase | Gratis tier, ingebouwde auth, realtime |
| Hosting | GitHub Pages | Gratis, statische PWA hosting |
| Versiebeheer | GitHub | Gratis, koppelt direct aan GitHub Pages |
| CSS Framework | Tailwind CSS v3 | Utility-first, mobile-first, CDN beschikbaar |
| E-mail reminders | Resend.com | Gratis tot 3.000 mails/maand |
| QR-codes | qrcode.js (browser) | Gratis bibliotheek, geen extra hardware |
| Platform | PWA | Werkt op smartphone en desktop, geen app store |

---

### 6.2 Stijlgids (gebaseerd op OPA Planner)

De visuele stijl is gebaseerd op de bestaande OPA Planner app (`jaspergeertsma.github.io/opa_app`). Dit zorgt voor herkenning en consistentie binnen de apps van Bibliotheek Noordwest Veluwe.

#### Kleurenschema

| Element | Kleurcode | Gebruik |
|---|---|---|
| Achtergrond app | `#0B1220` | Donker navy — body background |
| Achtergrond kaarten | `#162235` | Iets lichter navy — cards en modals |
| Hover state | `#1E2D45` | Card hover achtergrond |
| Primaire tekst | `#EAF0FF` | Wit-blauw — hoofdtekst |
| Secundaire tekst | `#9AA8C7` | Gedempte tekst, labels |
| Muted tekst | `#64748B` | Placeholder, subtekst |
| Primaire kleur | `#7C3AED` → `#A855F7` | Paars gradient — buttons, accenten |
| Accent kleur | `#F59E0B` → `#FB923C` | Amber/oranje gradient — highlights |
| Succes | `#10B981` | Groen — bevestigingen |
| Fout | `#EF4444` | Rood — foutmeldingen |
| Border | `rgba(148,163,184,.18)` | Subtiele randen op kaarten |

#### Typografie

- **Font:** Inter (Google Fonts) — `system-ui` als fallback
- **Gewichten:** 400 body / 500 labels / 600 subheadings / 700 headings
- **Tailwind:** `font-sans`, `tracking-tight` voor titels

#### Vormen & ruimte

- **Ronde hoeken:** `rounded-xl` (16px) voor kaarten, `rounded-full` voor buttons en badges
- **Glasmorfisme:** `backdrop-blur` met semi-transparante achtergrond op kaarten
- **Glow-effect:** `box-shadow` met paarse gloed op primaire buttons
- **Achtergrond decoratie:** twee grote blurred cirkels (paars links-boven, amber rechts-onder) op 10% opacity

#### Tailwind config (`tailwind.config.js`)

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        'bg-app':         '#0B1220',
        'bg-surface':     '#162235',
        'bg-hover':       '#1E2D45',
        'text-primary':   '#EAF0FF',
        'text-secondary': '#9AA8C7',
        'text-muted':     '#64748B',
        'primary':        '#7C3AED',
        'primary-end':    '#A855F7',
        'accent':         '#F59E0B',
        'accent-end':     '#FB923C',
        'success':        '#10B981',
        'error':          '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    }
  }
}
```

#### Componenten patroon

| Component | Tailwind klassen |
|---|---|
| Kaart | `bg-bg-surface rounded-xl border border-white/10 shadow-lg p-4` |
| Primaire button | `bg-gradient-to-r from-primary to-primary-end text-white rounded-full px-6 py-3 font-semibold` |
| Input veld | `bg-bg-surface border border-white/20 rounded-lg text-text-primary placeholder:text-text-muted focus:border-primary/50` |
| Status badge beschikbaar | `rounded-full px-3 py-1 text-xs font-medium bg-success/20 text-success` |
| Status badge in gebruik | `rounded-full px-3 py-1 text-xs font-medium bg-accent/20 text-accent` |
| Status badge onderhoud | `rounded-full px-3 py-1 text-xs font-medium bg-error/20 text-error` |

---

### 6.3 Datamodel

De database bestaat uit vier tabellen:

**`medewerkers`**
```
id, naam, email, pincode_hash, aangemaakt_op
```

**`materiaal`**
```
id, naam, type, qr_code, standaard_locatie, huidige_locatie,
huidige_medewerker_id, status (beschikbaar | in_gebruik),
lesbrief_url, aangemaakt_op
```

**`transacties`** *(auditlog)*
```
id, materiaal_id, medewerker_id,
type (uitchecken | inchecken | overrule | locatiewijziging),
locatie, tijdstip, notitie
```

**`onderhoudsmeldingen`**
```
id, materiaal_id, gemeld_door (medewerker_id), type_melding,
toelichting, foto_url, status (open | opgelost),
opgelost_door, tijdstip_gemeld, tijdstip_opgelost
```

---

### 6.4 QR-code aanpak

Elk item krijgt een unieke code bij aanmaken in de app. De app genereert automatisch een printbaar QR-label. De QR-code verwijst naar een directe URL:

```
https://[jouw-github-pages-url]/item/[unieke-code]
```

Medewerkers openen de URL via hun camera — geen speciale scanner app nodig.

---

### 6.5 Beveiliging

Bewuste keuze voor laagdrempeligheid omdat de data niet vertrouwelijk is:

- Pincode wordt gehasht opgeslagen — Supabase handelt dit automatisch af
- Geen wachtwoord reset flow in MVP
- Geen twee-factor authenticatie
- Volledige auditlog van alle acties

---

## 7. Aanbevolen Bouwvolgorde (MVP)

| Stap | Onderdeel | Toelichting |
|---|---|---|
| 1 | Supabase opzetten | Project aanmaken, tabellen bouwen op basis van datamodel |
| 2 | GitHub repo aanmaken | Koppel aan GitHub Pages voor hosting |
| 3 | Tailwind configureren | `tailwind.config.js` met custom kleuren instellen |
| 4 | Antigravity starten | Deze projectbrief als startprompt gebruiken |
| 5 | Registratie + login | Pincode auth via Supabase |
| 6 | Materiaal beheer | Items toevoegen, QR-codes genereren en printen |
| 7 | In/uitcheck flow | De kern van de app — QR-scan, meenemen, terugbrengen |
| 8 | Onderhoudsmelding flow | Meldingen aanmaken en sluiten |
| 9 | Dashboard | Overzicht en openstaande meldingen |
| 10 | E-mail reminder | Resend.com instellen voor 7-daagse herinnering |

---

## 8. Buiten MVP (toekomstige features)

De volgende features zijn bewust buiten de MVP gehouden maar het datamodel wordt alvast voorbereid:

- **Reserveringen** — wie reserveert, van/tot wanneer, welk materiaal, toelichting
- **Office 365 agenda-integratie** — via e-mail uitnodiging (geen directe sync nodig)
- **Beheerdersscherm** — materiaal toevoegen, verwijderen, gebruikers beheren
- **Pushnotificaties** — als alternatief voor e-mail reminders

---

## 9. Startprompt voor Google Antigravity

Gebruik onderstaande tekst als openingsprompt in de Antigravity Agent Manager:

```
Bouw een Progressive Web App (PWA) genaamd 'Digilab App' voor
Bibliotheek Noordwest Veluwe. De app is mobile-first en bedoeld voor
interne medewerkers.

Stack:
- Frontend: React + Tailwind CSS v3
- Database & Auth: Supabase
- Hosting: GitHub Pages
- E-mail: Resend.com

Visuele stijl (gebaseerd op jaspergeertsma.github.io/opa_app):
- Dark mode: achtergrond #0B1220, kaarten #162235
- Primaire tekst: #EAF0FF, secondair: #9AA8C7
- Primaire kleur: gradient van #7C3AED naar #A855F7 (paars)
- Accent: gradient van #F59E0B naar #FB923C (amber/oranje)
- Succes: #10B981, Fout: #EF4444
- Font: Inter (Google Fonts)
- Kaarten: rounded-xl, border border-white/10, shadow-lg, glasmorfisme
- Buttons: rounded-full, gradient paars, glow-effect
- Inputs: bg donker, border wit/20, focus:border-primary/50
- Badges: rounded-full, kleurgecodeerd op status
- Achtergrond: twee decoratieve blurred cirkels (paars + amber, opacity 10%)
- tailwind.config.js met custom kleuren: bg-app, bg-surface, bg-hover,
  text-primary, text-secondary, text-muted, primary, accent, success, error

Kernfunctionaliteiten:
1. Registratie met naam, email en 5-cijferige pincode (gehasht in Supabase)
2. Login via pincode
3. QR-scanpagina: scan een item en zie status, wie het heeft, openstaande
   onderhoudsmeldingen, en knoppen voor MEENEMEN en TERUGBRENGEN
4. Meenemen: pincode invoeren -> item staat op naam medewerker
5. Terugbrengen: pincode + locatie (Ermelo/Nunspeet) -> item beschikbaar
6. Overrule: als item van collega is, extra bevestiging vereist
7. Onderhoudsmelding: type kiezen (kapot/mist/verbruiksmateriaal),
   toelichting, foto, bevestigen met pincode
8. Dashboard: overzicht uitgecheckt materiaal + openstaande meldingen
9. E-mail reminder na 7 dagen via Resend.com

Datamodel (4 tabellen):
- medewerkers: id, naam, email, pincode_hash, aangemaakt_op
- materiaal: id, naam, type, qr_code, standaard_locatie, huidige_locatie,
  huidige_medewerker_id, status, lesbrief_url
- transacties: id, materiaal_id, medewerker_id, type, locatie, tijdstip, notitie
- onderhoudsmeldingen: id, materiaal_id, gemeld_door, type_melding,
  toelichting, foto_url, status, opgelost_door, tijdstip_gemeld, tijdstip_opgelost

Begin met stap 1: stel tailwind.config.js in met de custom kleuren,
maak daarna de Supabase tabellen aan met relaties en RLS policies,
en genereer de PWA structuur in React.
```

---

*Dit document is gegenereerd op basis van een conceptsessie met AI-consultant. Versie 1.0 — Maart 2026.*
