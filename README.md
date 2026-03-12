# 🧪 Digilab BNWV App 

Een moderne, mobiel-vriendelijke webapplicatie voor het beheer en de reservering van ICT-leskisten en Digi-materiaal van **Bibliotheek Noordwest Veluwe**.

[![Digilab CI/CD Controle](https://github.com/digilabbnwv/bnwv_digilab_app/actions/workflows/ci.yml/badge.svg)](https://github.com/digilabbnwv/bnwv_digilab_app/actions/workflows/ci.yml)

## 🚀 Over het Project
De Digilab App is ontworpen om het logistieke proces rondom ICT-materiaal te stroomlijnen. Medewerkers kunnen materiaal scannen via QR-codes, de huidige status inzien, onderhoudsmeldingen maken en reserveringen plaatsen die automatisch gesynchroniseerd worden met de Microsoft 365 agenda.

### Belangrijkste Functionaliteiten
- **Materiaalbeheer**: Real-time statusoverzicht (beschikbaar/in gebruik/defect).
- **QR-Scanning**: Snel in- en uitchecken van materiaal door het scannen van fysieke labels.
- **Reserveringssysteem**: Plan materiaal vooruit voor specifieke periodes.
- **M365 Agenda Synchronisatie**: Automatische koppeling met Outlook agenda (`ictleskisten@bibliotheeknwveluwe.nl`) via Power Automate.
- **Onderhoudsregistratie**: Melden van defecten of ontbrekende onderdelen.
- **Offline First (Mock Mode)**: Volledige functionaliteit beschikbaar zonder live cloud-verbinding voor demonstratiedoeleinden.

---

## 🛠 Technische Stack
- **Frontend**: React (Vite) met Tailwind CSS.
- **Backend**: Supabase (Database, Auth & Edge Functions).
- **Integratie**: Microsoft Power Automate Webhooks.
- **Testing**: Vitest (Unit/Component) & Playwright (End-to-End).
- **Deployment**: GitHub Actions & GitHub Pages.

---

## 🏗 Architectuur & Beveiliging
Het project volgt een security-first benadering voor open-source repositories:

### Agenda Synchronisatie Keten
1. **Frontend**: Verstuurt acties naar een beveiligde Supabase Edge Function.
2. **Edge Function**: Valideert de aanvraag en haalt de geheime Webhook URL op uit de server-side secrets.
3. **Power Automate**: Ontvangt de payload via een gesigneerde URL en voert de acties uit in Office 365.
*Er worden GEEN geheime URL's of keys opgeslagen in de frontend code of gecommit naar GitHub.*

### Authenticatie
De app maakt gebruik van een custom medewerkers-authenticatie op basis van e-mail en SHA-256 gehashte pincodes, wat een drempelloze ervaring biedt op gedeelde apparaten in de bibliotheek-vestigingen.

---

## 💻 Lokale Ontwikkeling

1. **Clone de repository**:
   ```bash
   git clone https://github.com/digilabbnwv/bnwv_digilab_app.git
   cd bnwv_digilab_app
   ```

2. **Installeer dependencies**:
   ```bash
   npm install
   ```

3. **Configureer .env**:
   Kopieer `.env.example` naar `.env` en vul de Supabase credentials in. Zet `VITE_MOCK_MODE=true` om zonder live database te werken.

4. **Start de app**:
   ```bash
   npm run dev
   ```

---

## 🧪 Testing & Kwaliteit
We borgen de kwaliteit via geautomatiseerde checks:

- **Unit Tests**: `npm run test` (Draait Vitest voor logica checks).
- **E2E Tests**: `npm run test:e2e` (Draait Playwright voor browser interacties).
- **Linting**: `npm run lint` (Controleert code stijl).
- **Pre-commit**: Husky zorgt ervoor dat tests en linting succesvol zijn vóórdat een commit wordt toegestaan.

---

## 📖 Documentatie voor Beheerders
- [Power Automate Configuratie Gids](./power_automate_handleiding.md)
- [Database Schema SQL](./supabase-schema.sql)

Developed with ❤️ for Bibliotheek Noordwest Veluwe.
