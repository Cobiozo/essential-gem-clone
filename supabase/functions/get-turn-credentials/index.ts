import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Full list of ExpressTURN Premium relay servers
const TURN_SERVERS_3478 = [
  'relay1', 'relay2', 'relay3', 'relay4', 'relay5',
  'relay6', 'relay7', 'relay8', 'relay9', 'relay10',
  'relay11', 'relay12', 'relay13', 'relay14', 'relay15',
  'relay16', 'relay17', 'relay18', 'relay19', 'global',
].map(s => `turn:${s}.expressturn.com:3478`);

function buildPremiumIceServers(username: string, password: string) {
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Group 1: All relay servers on port 3478 (UDP+TCP)
    {
      urls: TURN_SERVERS_3478,
      username,
      credential: password,
    },
    // Group 2: TCP on port 80 (firewall-friendly)
    {
      urls: [
        'turn:relay1.expressturn.com:80',
        'turn:relay1.expressturn.com:80?transport=tcp',
      ],
      username,
      credential: password,
    },
    // Group 3: TLS on port 443 (most firewall-friendly)
    {
      urls: [
        'turns:relay1.expressturn.com:443?transport=tcp',
      ],
      username,
      credential: password,
    },
  ];
}

function buildHmacIceServers(username: string, credential: string) {
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
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
}

async function generateHmacCredentials(userId: string, secret: string) {
  const ttl = 86400;
  const unixTimestamp = Math.floor(Date.now() / 1000) + ttl;
  const username = `${unixTimestamp}:${userId}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(username));
  const credential = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return { username, credential };
}

const STUN_ONLY = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth: guest token or JWT ---
    const guestTokenId = req.headers.get('X-Guest-Token');
    let userId = 'anonymous';

    if (guestTokenId) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: guestToken, error: guestError } = await supabase
        .from('meeting_guest_tokens')
        .select('id, expires_at')
        .eq('id', guestTokenId)
        .maybeSingle();
      if (guestError || !guestToken || new Date(guestToken.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Invalid guest token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = guestTokenId;
    } else {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = user.id;
    }

    // --- Credentials: Premium static > HMAC fallback > STUN only ---
    const premiumUsername = Deno.env.get('EXPRESSTURN_USERNAME');
    const premiumPassword = Deno.env.get('EXPRESSTURN_PASSWORD');

    if (premiumUsername && premiumPassword) {
      // Premium mode: static credentials + full server list
      const iceServers = buildPremiumIceServers(premiumUsername, premiumPassword);
      console.log('[get-turn-credentials] Premium mode for user:', userId, '- servers:', TURN_SERVERS_3478.length);
      return new Response(JSON.stringify({ iceServers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback: HMAC-based credentials
    const secret = Deno.env.get('EXPRESSTURN_SECRET');
    if (secret) {
      const { username, credential } = await generateHmacCredentials(userId, secret);
      const iceServers = buildHmacIceServers(username, credential);
      console.log('[get-turn-credentials] HMAC fallback for user:', userId);
      return new Response(JSON.stringify({ iceServers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No TURN configured — STUN only
    console.warn('[get-turn-credentials] No TURN secrets configured, STUN only');
    return new Response(JSON.stringify({ iceServers: STUN_ONLY }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating TURN credentials:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
