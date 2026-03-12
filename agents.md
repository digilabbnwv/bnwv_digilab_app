# 🤖 Developer Agent Guide — Digilab BNWV Project

Welkom agent. Dit document bevat de essentiële regels en context om productief en veilig bij te dragen aan de BNWV Digilab applicatie.

## 🎯 Projectdoel
Het bouwen van een robuust, veilig en gebruiksvriendelijk systeem voor materiaalbeheer in bibliotheken, met een naadloze integratie tussen de fysieke wereld (QR) en de digitale werkplek (M365).

---

## 🔐 Veiligheidsvoorschriften (CRITIEK)
1. **Geen Geheimen in Code**: Sla NOOIT API keys, Webhook URLs of tokens op in bronbestanden. Gebruik `import.meta.env` voor publieke keys en Supabase Secrets voor server-side keys.
2. **Webhook Proxying**: Communiceer nooit rechtstreeks vanuit de frontend met externe APIs (zoals Power Automate). Gebruik altijd de `agenda-sync` Edge Function als beveiligde tussenlaag.
3. **Custom Auth**: De applicatie gebruikt Medewerker Pincodes. Ga er niet vanuit dat Supabase Auth JWT's altijd aanwezig zijn. De Edge Function is momenteel "anon-vertoouwd" binnen de geconfigureerde CORS-policy.

---

## 🛠 Coding Standards
- **Framework**: React 18+ met functionele componenten.
- **Styling**: Tailwind CSS. Gebruik de kleurendefinities uit `tailwind.config.js` (`primary`, `accent`, `text-primary`).
- **Icons**: Gebruik uitsluitend `lucide-react`.
- **Taal**: De UI is in het **Nederlands**. Codeer variabelen en functies in het Engels of Nederlands (consistent met de huidige file).
- **Paths**: Gebruik altijd absolute of root-relative `/bnwv_digilab_app/` paths voor assets wegens de GitHub Pages hosting.

---

## 🧪 Testing & Kwaliteit
- **Zero-Regression Policy**: Elke nieuwe logische functie in `src/lib/` MOET een bijbehorende Vitest unit test hebben.
- **E2E First**: Kritieke user flows (Inloggen, Reserveren, Scannen) worden getest met Playwright in `e2e/`. Update deze bij UI wijzigingen.
- **Husky**: Pre-commit hooks draaien `lint-staged`. Als de linter of tests falen, wordt de commit geweigerd. Omzeil dit alleen in uiterste noodzaak met `--no-verify`.

---

## 🔄 Data & Omgevingen
- **Mock Mode**: De app heeft een krachtige `mockDB.js`. Controleer altijd `import.meta.env.VITE_MOCK_MODE`. Wijzigingen in de database-schema's moeten zowel in `supabase-schema.sql` als in de `mockDB.js` worden doorgevoerd om lokale ontwikkeling mogelijk te houden.
- **Edge Functions**: Liggen in `/supabase/functions/`. Gebruik `Deno` runtime standaarden voor deze bestanden.

---

## 📦 Deployment Flow
1. **CI Pipeline**: GitHub Actions controleert elke push.
2. **CD Pipeline**: `deploy.yml` bouwt de `dist/` map en pusht deze naar de `gh-pages` branch.
3. **Base Path**: De applicatie leeft op `/bnwv_digilab_app/`. Houd hier rekening mee in de Router en Vite config.

---

## 📂 Belangrijke Bestanden
- `src/lib/reserveringen.js`: Core logica reserveringen.
- `src/lib/agendaSync.js`: Frontend trigger voor Outlook sync.
- `supabase/functions/agenda-sync/index.ts`: De beveiligde brug naar Power Automate.
- `playwright.config.js`: Specifieke Windows-vs-Linux setup voor E2E tests.

*Let's build something great.*
