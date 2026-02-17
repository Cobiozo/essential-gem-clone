import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
}

// MIME type mapping
const mimeTypes: Record<string, string> = {
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'ogg': 'video/ogg',
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'aac': 'audio/aac',
  'm4a': 'audio/mp4',
}

function getContentType(url: string): string {
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase() || ''
  return mimeTypes[ext] || 'application/octet-stream'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const mediaToken = url.searchParams.get('token')

    if (!mediaToken) {
      return new Response('Missing token', {
        status: 400,
        headers: corsHeaders
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Look up the token
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from('media_access_tokens')
      .select('*')
      .eq('token', mediaToken)
      .single()

    if (tokenError || !tokenRecord) {
      console.error('Token not found:', mediaToken)
      return new Response('Forbidden - invalid token', {
        status: 403,
        headers: corsHeaders
      })
    }

    // Check expiration
    if (new Date(tokenRecord.expires_at) < new Date()) {
      console.error('Token expired:', mediaToken)
      // Clean up expired token
      supabaseAdmin.from('media_access_tokens').delete().eq('id', tokenRecord.id)
      return new Response('Forbidden - token expired', {
        status: 403,
        headers: corsHeaders
      })
    }

    // Check usage limit
    if (tokenRecord.use_count >= tokenRecord.max_uses) {
      console.error('Token max uses exceeded:', mediaToken)
      return new Response('Forbidden - token used up', {
        status: 403,
        headers: corsHeaders
      })
    }

    // Increment use count (fire and forget)
    supabaseAdmin
      .from('media_access_tokens')
      .update({ use_count: tokenRecord.use_count + 1 })
      .eq('id', tokenRecord.id)
      .then(() => {})

    const realUrl = tokenRecord.real_url

    // Redirect 302 to the real URL — browser fetches directly from VPS
    // This avoids Edge Function timeout limits on large video files
    console.log(`Redirecting to media for token ${mediaToken}`)

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': realUrl,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Disposition': 'inline',
      }
    })

  } catch (error) {
    console.error('Stream media error:', error)
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders
    })
  }
})
