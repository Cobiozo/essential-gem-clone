import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    // Verify caller
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const callerId = claimsData.claims.sub

    // Check caller is admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Access denied: admin only' }), { status: 403, headers: corsHeaders })
    }

    const { target_user_id } = await req.json()
    if (!target_user_id) {
      return new Response(JSON.stringify({ error: 'target_user_id required' }), { status: 400, headers: corsHeaders })
    }

    // Get user's MFA factors
    const { data: factorsData, error: factorsError } = await adminClient.auth.admin.mfa.listFactors({
      userId: target_user_id,
    })

    if (factorsError) {
      console.error('Error listing factors:', factorsError)
      return new Response(JSON.stringify({ error: factorsError.message }), { status: 500, headers: corsHeaders })
    }

    const factors = [...(factorsData?.totp || []), ...(factorsData?.phone || [])]
    let deletedCount = 0

    for (const factor of factors) {
      const { error: deleteError } = await adminClient.auth.admin.mfa.deleteFactor({
        userId: target_user_id,
        factorId: factor.id,
      })
      if (deleteError) {
        console.error(`Error deleting factor ${factor.id}:`, deleteError)
      } else {
        deletedCount++
      }
    }

    // Log the action
    await adminClient.from('user_activity_log').insert({
      user_id: callerId,
      action_type: 'admin_reset_mfa',
      action_details: `Reset MFA for user ${target_user_id}, deleted ${deletedCount} factors`,
      metadata: { target_user_id, deleted_count: deletedCount },
    })

    console.log(`Admin ${callerId} reset MFA for ${target_user_id}: ${deletedCount} factors deleted`)

    return new Response(
      JSON.stringify({ success: true, deleted_count: deletedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})