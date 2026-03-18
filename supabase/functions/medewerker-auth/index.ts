import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + 'digilab_salt_2026')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Maakt een HS256 JWT aan, gesigneerd met het Supabase JWT-secret. */
async function createJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const encoder = new TextEncoder()

  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const header = { alg: 'HS256', typ: 'JWT' }
  const signingInput = `${b64url(header)}.${b64url(payload)}`

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${signingInput}.${sigB64}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action = 'login', email, pincode, naam } = body

    if (!email || !pincode) {
      return new Response(
        JSON.stringify({ error: 'E-mailadres en pincode zijn verplicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Service role bypast RLS voor pincode-verificatie
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const pincode_hash = await hashPin(pincode)

    // ── Registreren ───────────────────────────────────────────────────────────
    if (action === 'registreer') {
      if (!naam) {
        return new Response(
          JSON.stringify({ error: 'Naam is verplicht bij registratie' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const { data: nieuw, error: insertError } = await supabaseAdmin
        .from('medewerkers')
        .insert([{ naam, email: email.toLowerCase().trim(), pincode_hash }])
        .select('id, naam, email, rol, aangemaakt_op')
        .single()

      if (insertError) {
        const isDuplicate = insertError.code === '23505'
        return new Response(
          JSON.stringify({ error: isDuplicate ? 'E-mailadres is al in gebruik' : insertError.message }),
          { status: isDuplicate ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const jwt = await maakJwtVoorMedewerker(nieuw, Deno.env.get('SUPABASE_JWT_SECRET')!)
      return new Response(
        JSON.stringify({ jwt, medewerker: nieuw }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Inloggen ─────────────────────────────────────────────────────────────
    const { data: medewerker, error } = await supabaseAdmin
      .from('medewerkers')
      .select('id, naam, email, rol, aangemaakt_op')
      .eq('email', email.toLowerCase().trim())
      .eq('pincode_hash', pincode_hash)
      .single()

    if (error || !medewerker) {
      return new Response(
        JSON.stringify({ error: 'Onjuist e-mailadres of pincode' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const jwt = await maakJwtVoorMedewerker(medewerker, Deno.env.get('SUPABASE_JWT_SECRET')!)

    return new Response(
      JSON.stringify({ jwt, medewerker }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (_err) {
    return new Response(
      JSON.stringify({ error: 'Interne serverfout' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

function maakJwtVoorMedewerker(
  medewerker: { id: string; rol: string; email: string },
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return createJwt(
    {
      sub: medewerker.id,
      email: medewerker.email,
      role: 'authenticated',   // PostgREST gebruikt deze role
      iss: 'supabase',
      iat: now,
      exp: now + 8 * 60 * 60, // 8 uur geldig
      medewerker_rol: medewerker.rol, // voor RLS-policies
    },
    secret,
  )
}
