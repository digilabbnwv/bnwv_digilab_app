# Power Automate Configuratiegids — Digilab BNWV

Deze gids beschrijft hoe de Microsoft Power Automate-flows worden opgezet die de
Digilab-app gebruikt voor Outlook-agenda's en e-mailnotificaties. De app praat
**nooit** rechtstreeks met Power Automate: alle verkeer loopt via beveiligde
Supabase Edge Functions die de geheime webhook-URL server-side ophalen.

```
Frontend (React)  →  Supabase Edge Function  →  Power Automate (webhook)  →  Microsoft 365
```

> **Beveiligingsprincipe:** webhook-URL's en secrets staan uitsluitend in
> Supabase Secrets, nooit in de frontend of in Git. Elke uitgaande aanroep naar
> Power Automate draagt de header `x-digilab-secret`. Elke flow moet die header
> controleren en de aanvraag weigeren als hij niet klopt.

---

## Overzicht van de flows en secrets

| Edge Function | Doel | Uitgaande secret (webhook-URL) | Extra secrets |
|---|---|---|---|
| `agenda-sync` | Reserveringen + workshops naar Outlook-agenda's | `WEBHOOK_URL_ICT`, `WEBHOOK_URL_ERMELO`, `WEBHOOK_URL_NUNSPEET` | — |
| `metrics-rapportage` | Periodieke week-/maandmail (pg_cron) | `WEBHOOK_URL_METRICS` | `METRICS_REPORT_SECRET` (inbound) |
| `melding-notificatie` | Notificaties bij onderhoudsmeldingen | `WEBHOOK_URL_MELDINGEN` | — |

Gedeelde secrets (voor alle flows):

| Secret | Betekenis |
|---|---|
| `DIGILAB_WEBHOOK_SECRET` | Wordt als header `x-digilab-secret` meegestuurd; elke flow controleert deze. |
| `TOEGESTANE_ORIGIN` | CORS-origin van de app (bijv. `https://digilabbnwv.github.io`). |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Gebruikt door `metrics-rapportage` en `melding-notificatie` om ontvangers server-side op te zoeken. |

### Secrets zetten

```bash
supabase secrets set DIGILAB_WEBHOOK_SECRET="<lange-willekeurige-string>"
supabase secrets set WEBHOOK_URL_MELDINGEN="<url-uit-de-flow-hieronder>"
```

Bekijken welke secrets bestaan (waarden worden niet getoond):

```bash
supabase secrets list
```

---

## Flow bouwen: `melding-notificatie` (nieuw)

Deze flow ontvangt één payload en stuurt **één e-mail per item** in de
`berichten`-array. De app bepaalt zelf wie de ontvangers zijn (alle beheerders +
de aanmaker) en levert per ontvanger een kant-en-klaar onderwerp en HTML-body
aan. De flow hoeft dus geen ontvangers te kennen of samen te stellen.

### Payload die de Edge Function stuurt

```json
{
  "type": "melding_notificatie",
  "actie": "nieuw",
  "melding_id": "8783daf7-4755-4039-8b03-a9ebbe6fe8ba",
  "berichten": [
    {
      "email": "beheerder@bibliotheeknwveluwe.nl",
      "onderwerp": "Nieuwe onderhoudsmelding: ClassVR Set — Ermelo",
      "html_body": "<div>…volledige HTML…</div>"
    }
  ],
  "gegenereerd_op": "2026-08-19T12:00:00.000Z"
}
```

- `actie` is `"nieuw"` (nieuwe melding) of `"status"` (statuswijziging). De flow
  hoeft hier niets mee te doen — het bepaalt alleen de inhoud, die al in
  `onderwerp`/`html_body` is verwerkt.
- `berichten` bevat 1 of meer items. Bij een nieuwe melding zit hier de
  bevestiging voor de aanmaker + één bericht per beheerder in; bij een
  statuswijziging alleen de aanmaker.

### Stappen in Power Automate

1. **Nieuwe flow** → *Automated cloud flow* → sla het maken over en kies de
   trigger **"When a HTTP request is received"** (Request).

2. Zet bij de trigger **"Request Body JSON Schema"** het volgende schema. Hiermee
   worden `berichten`, `email`, `onderwerp` en `html_body` beschikbaar als
   dynamische waarden:

   ```json
   {
     "type": "object",
     "properties": {
       "type":        { "type": "string" },
       "actie":       { "type": "string" },
       "melding_id":  { "type": "string" },
       "gegenereerd_op": { "type": "string" },
       "berichten": {
         "type": "array",
         "items": {
           "type": "object",
           "properties": {
             "email":     { "type": "string" },
             "onderwerp": { "type": "string" },
             "html_body": { "type": "string" }
           },
           "required": ["email", "onderwerp", "html_body"]
         }
       }
     }
   }
   ```

3. **Methode vastzetten op POST**: open de trigger-instellingen (⋯) → *Settings*,
   of voeg direct onder de trigger een controle toe. De Edge Function stuurt
   altijd `POST`.

4. **Secret controleren (verplicht).** Voeg een **Condition** toe:
   - Linkerwaarde (expressie):
     `triggerOutputs()?['headers']?['x-digilab-secret']`
   - Operatie: **is equal to**
   - Rechterwaarde: de waarde van `DIGILAB_WEBHOOK_SECRET`
     *(tip: bewaar deze in een Power Automate "environment variable" i.p.v. hem
     hard in te typen).*

   - **Bij "If no"**: voeg **"Response"** toe met statuscode **401** en stop
     (Terminate).
   - **Bij "If yes"**: ga verder met de stappen hieronder.

5. **Apply to each** over `berichten` (uit de trigger-body). Voeg daarbinnen toe:

   **"Send an email (V2)"** (Office 365 Outlook-connector, verbonden met de
   verzendmailbox — bijv. een gedeelde mailbox als `digilab@bibliotheeknwveluwe.nl`):
   - **To**: `email` (uit het huidige item)
   - **Subject**: `onderwerp`
   - **Body**: `html_body`

   > De body van "Send an email (V2)" rendert HTML. Plak `html_body` als
   > dynamische waarde in het body-veld (schakel eventueel de body-editor naar
   > code-/HTML-weergave zodat de opmaak niet wordt ge-escaped).

   > Verstuur je vanuit een **gedeelde mailbox**? Zet dan onder *Advanced
   > options* het veld **From (Send as)** op dat mailboxadres (de verbonden
   > account moet "Send as"-rechten hebben).

6. **Response 200.** Voeg als laatste (na de Apply to each) een **"Response"**
   toe met statuscode **200**. De Edge Function verwacht een 2xx; anders logt hij
   een fout.

7. **Sla de flow op.** De trigger-URL verschijnt nu bij "When a HTTP request is
   received". Kopieer deze en zet hem als secret:

   ```bash
   supabase secrets set WEBHOOK_URL_MELDINGEN="<gekopieerde-url>"
   ```

8. **Deploy de Edge Function** (zonder JWT-verificatie, want de app gebruikt
   custom pincode-auth):

   ```bash
   supabase functions deploy melding-notificatie --no-verify-jwt
   ```

---

## Ontvangers beheren

De ontvangers van meldingsnotificaties worden **niet** in Power Automate
ingesteld, maar afgeleid uit de database:

- **Beheerders** = alle rijen in tabel `medewerkers` met `rol = 'beheerder'`.
  Iemand toevoegen/verwijderen als ontvanger van nieuwe-melding-mails = de rol
  van die medewerker aanpassen.
- **Aanmaker** = de medewerker die de melding indiende (krijgt bevestiging +
  bericht bij statuswijziging). Is de aanmaker zelf beheerder, dan krijgt die
  géén dubbele mail (de beheerder-notificatie slaat de aanmaker over).

> De periodieke week-/maandrapportage (`metrics-rapportage`) gebruikt een aparte
> lijst: tabel `rapportage_ontvangers` (`email`, `actief`). Dat staat los van de
> meldingsnotificaties.

---

## Testen

1. **Los testen in Power Automate**: gebruik in de flow-editor *Test → Manually*
   en stuur een test-POST (bijv. met de "Peek code"-URL) met de bovenstaande
   voorbeeld-payload en de header `x-digilab-secret`. Controleer dat er een mail
   binnenkomt en de flow een 200 teruggeeft.
2. **End-to-end in de app**: maak in de app een onderhoudsmelding aan. De
   aanmaker moet een bevestiging krijgen en de beheerders een notificatie.
   Wijzig daarna de status → de aanmaker krijgt een statusupdate.
3. **Logs bekijken** bij problemen:
   ```bash
   supabase functions logs melding-notificatie
   ```

---

## Problemen oplossen

| Symptoom | Oorzaak / oplossing |
|---|---|
| Geen enkele mail, app werkt wel | Notificaties falen bewust "stil" zodat ze het melden niet blokkeren. Check `supabase functions logs melding-notificatie`. |
| Function-log: `WEBHOOK_URL_MELDINGEN ... ontbreekt` | Secret niet gezet — zie stap 7. |
| Function-log: `Power Automate fout: 401` | Header-secret in de flow (stap 4) komt niet overeen met `DIGILAB_WEBHOOK_SECRET`. |
| Mail komt aan maar HTML wordt als platte tekst getoond | Body-veld van "Send an email (V2)" staat niet op HTML — plak `html_body` in de code-/HTML-weergave. |
| Beheerder krijgt geen notificatie | Staat `rol = 'beheerder'` én een geldig `email` in tabel `medewerkers`? |
| `melding-notificatie` geeft 401 aan de app-kant | Function is mét JWT-verificatie gedeployed — deploy opnieuw met `--no-verify-jwt`. |

---

## Referentie: bestaande flows (payload-formaten)

Voor `agenda-sync` en `metrics-rapportage` gelden dezelfde beveiligingsregels
(POST + `x-digilab-secret`). Payload-formaten ter referentie:

**`agenda-sync` — reservering** (`WEBHOOK_URL_ICT`):
```json
{ "agenda_type": "ict_leskisten", "actie": "aanmaken|annuleren|wijzigen",
  "reservering_id": "…", "product_naam": "…", "product_code": "…",
  "medewerker_naam": "…", "medewerker_email": "…",
  "van_datum": "YYYY-MM-DD", "tot_datum": "YYYY-MM-DD", "toelichting": "…" }
```

**`agenda-sync` — workshop** (`WEBHOOK_URL_ERMELO` / `WEBHOOK_URL_NUNSPEET`):
```json
{ "agenda_type": "digilab_ermelo|digilab_nunspeet", "actie": "aanmaken|annuleren|wijzigen",
  "workshop_id": "…", "titel": "…", "datum": "YYYY-MM-DD",
  "start_tijd": "HH:MM", "eind_tijd": "HH:MM", "locatie": "…",
  "materiaal_omschrijving": "…", "max_deelnemers": 12, "opmerkingen": "…" }
```

**`metrics-rapportage`** (`WEBHOOK_URL_METRICS`):
```json
{ "type": "metrics_rapportage", "periode": "wekelijks|maandelijks",
  "ontvangers": ["…@…"], "onderwerp": "…", "html_body": "<div>…</div>",
  "gegenereerd_op": "ISO-datum" }
```
Bij `metrics-rapportage` levert de app zelf de `ontvangers`-array aan; de flow
verstuurt naar die adressen.
