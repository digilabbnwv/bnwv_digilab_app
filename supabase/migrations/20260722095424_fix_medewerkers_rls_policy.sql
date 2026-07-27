-- Fix: medewerkers had policies maar RLS stond uit (policy_exists_rls_disabled /
-- rls_disabled_in_public).
--
-- Belangrijker: de live database bevat een policy "Alleen via Edge Function
-- registreren" die stamt uit een custom-JWT-experiment (commit dbede03,
-- "implementeer custom JWT-auth via Edge Function"). Dat experiment is
-- gerevert in commit a484e49 ("revert: terug naar directe Supabase auth
-- (geen custom JWT)") omdat Supabase's ECC-signing keys niet compatibel
-- waren met onze zelfgemaakte HS256-JWT. Alleen de frontend/Edge Function-
-- code is toen gerevert — deze policy op de database is destijds blijven
-- staan en is nooit teruggezet in dit schema.
--
-- Registreren gaat sindsdien weer via een directe anon-key insert
-- (src/lib/auth.js -> registreer()), niet via de medewerker-auth Edge
-- Function. Als je nu simpelweg RLS zou aanzetten, blokkeert deze
-- verouderde policy alle registraties. Daarom eerst de policy vervangen
-- door de variant die bij de huidige (teruggedraaide) architectuur hoort.

DROP POLICY IF EXISTS "Alleen via Edge Function registreren" ON medewerkers;

CREATE POLICY "Iedereen kan medewerker aanmaken" ON medewerkers
  FOR INSERT WITH CHECK (true);

ALTER TABLE medewerkers ENABLE ROW LEVEL SECURITY;
