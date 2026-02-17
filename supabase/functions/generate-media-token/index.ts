import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify user JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = claimsData.claims.sub

    // Parse request body
    const { media_url } = await req.json()
    if (!media_url || typeof media_url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing media_url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate unique token
    const mediaToken = crypto.randomUUID()

    // Store token with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes TTL

    const { error: insertError } = await supabaseAdmin
      .from('media_access_tokens')
      .insert({
        token: mediaToken,
        real_url: media_url,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
        max_uses: 100
      })

    if (insertError) {
      console.error('Error inserting token:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to generate token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cleanup expired tokens (fire and forget)
    supabaseAdmin.rpc('cleanup_expired_media_tokens').then(({ data }) => {
      if (data) console.log(`Cleaned up ${data} expired tokens`)
    })

    console.log(`Generated media token for user ${userId}, expires: ${expiresAt.toISOString()}`)

    return new Response(JSON.stringify({ token: mediaToken }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Generate media token error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
