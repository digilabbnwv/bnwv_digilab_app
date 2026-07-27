-- Fix: reserveringen-tabel had geen RLS ingeschakeld (rls_disabled_in_public).
-- Alle andere tabellen volgen het patroon "RLS aan + policy USING (true)" —
-- toegang wordt in de app-laag beperkt (pincode-auth, geen Supabase Auth/JWT),
-- niet op database-niveau. Deze tabel was per ongeluk overgeslagen.

ALTER TABLE reserveringen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan reserveringen zien en beheren" ON reserveringen
  FOR ALL USING (true);
