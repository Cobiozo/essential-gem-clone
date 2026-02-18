import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for guest token first
    const guestTokenId = req.headers.get('X-Guest-Token');
    
    if (guestTokenId) {
      // Guest mode: verify guest token
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { data: guestToken, error: guestError } = await supabase
        .from('meeting_guest_tokens')
        .select('id, expires_at')
        .eq('id', guestTokenId)
        .maybeSingle();
      
      if (guestError || !guestToken || new Date(guestToken.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Invalid guest token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Guest is valid, generate TURN credentials below using guestTokenId as userId
      const userId = guestTokenId;
      
      const secret = Deno.env.get('EXPRESSTURN_SECRET');
      if (!secret) {
        const iceServers = [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ];
        return new Response(JSON.stringify({ iceServers }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const ttl = 86400;
      const unixTimestamp = Math.floor(Date.now() / 1000) + ttl;
      const username = `${unixTimestamp}:${userId}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(username));
      const credential = btoa(String.fromCharCode(...new Uint8Array(signature)));
      
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: ['turn:relay1.expressturn.com:3478', 'turn:relay1.expressturn.com:3478?transport=tcp', 'turn:relay1.expressturn.com:3480', 'turns:relay1.expressturn.com:443?transport=tcp'],
          username, credential,
        },
      ];
      return new Response(JSON.stringify({ iceServers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify JWT for authenticated users
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Generate ephemeral TURN credentials using HMAC-SHA1
    const secret = Deno.env.get('EXPRESSTURN_SECRET');
    if (!secret) {
      console.warn('[get-turn-credentials] EXPRESSTURN_SECRET not configured, returning STUN only');
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ];
      return new Response(JSON.stringify({ iceServers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TTL: 24 hours
    const ttl = 86400;
    const unixTimestamp = Math.floor(Date.now() / 1000) + ttl;
    const username = `${unixTimestamp}:${userId}`;

    // Generate HMAC-SHA1 credential
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(username));
    const credential = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Use ExpressTURN servers (matching the EXPRESSTURN_SECRET)
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      {
        urls: [
          'turn:relay1.expressturn.com:3478',
          'turn:relay1.expressturn.com:3478?transport=tcp',
          'turn:relay1.expressturn.com:3480',
          'turns:relay1.expressturn.com:443?transport=tcp',
        ],
        username,
        credential,
      },
    ];

    console.log('[get-turn-credentials] Generated credentials for user:', userId);

    return new Response(JSON.stringify({ iceServers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating TURN credentials:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
