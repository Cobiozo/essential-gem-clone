import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    console.log(`[cleanup-old-certificates] Deleting files older than ${cutoffDate}`);

    // Query storage.objects for old certificate files
    const { data: oldFiles, error: queryError } = await supabaseAdmin
      .from('objects' as any)
      .select('name')
      .eq('bucket_id', 'certificates')
      .lt('created_at', cutoffDate);

    if (queryError) {
      // Fallback: use storage API to list and filter
      console.log('[cleanup-old-certificates] Direct query failed, using storage API fallback');
      return await fallbackCleanup(supabaseAdmin, cutoffDate, corsHeaders);
    }

    const filePaths = (oldFiles || []).map((f: any) => f.name);
    console.log(`[cleanup-old-certificates] Found ${filePaths.length} files to delete`);

    let totalDeleted = 0;
    const errors: string[] = [];
    const batchSize = 100;

    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const { error: deleteError } = await supabaseAdmin.storage
        .from('certificates')
        .remove(batch);

      if (deleteError) {
        errors.push(`Batch ${Math.floor(i / batchSize)}: ${deleteError.message}`);
      } else {
        totalDeleted += batch.length;
      }
    }

    const result = {
      success: true,
      cutoff_date: cutoffDate,
      total_found: filePaths.length,
      total_deleted: totalDeleted,
      errors: errors.length > 0 ? errors : undefined,
      message: `Usunięto ${totalDeleted} z ${filePaths.length} certyfikatów starszych niż 30 dni`,
    };

    console.log('[cleanup-old-certificates] Result:', JSON.stringify(result));

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[cleanup-old-certificates] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fallbackCleanup(supabaseAdmin: any, cutoffDate: string, corsHeaders: Record<string, string>) {
  const cutoffTime = new Date(cutoffDate).getTime();
  const bucket = 'certificates';
  let totalDeleted = 0;
  const errors: string[] = [];

  const { data: items, error: listError } = await supabaseAdmin.storage
    .from(bucket)
    .list('', { limit: 1000 });

  if (listError) {
    throw new Error(`List error: ${listError.message}`);
  }

  const allFiles: string[] = [];

  for (const item of items || []) {
    if (item.id === null) {
      const { data: folderFiles } = await supabaseAdmin.storage
        .from(bucket)
        .list(item.name, { limit: 1000 });

      for (const file of folderFiles || []) {
        if (file.id !== null && new Date(file.created_at).getTime() < cutoffTime) {
          allFiles.push(`${item.name}/${file.name}`);
        }
      }
    } else if (new Date(item.created_at).getTime() < cutoffTime) {
      allFiles.push(item.name);
    }
  }

  console.log(`[cleanup-old-certificates] Fallback found ${allFiles.length} old files`);

  const batchSize = 100;
  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    const { error: deleteError } = await supabaseAdmin.storage
      .from(bucket)
      .remove(batch);

    if (deleteError) {
      errors.push(`Batch delete error: ${deleteError.message}`);
    } else {
      totalDeleted += batch.length;
    }
  }

  const result = {
    success: true,
    cutoff_date: cutoffDate,
    total_found: allFiles.length,
    total_deleted: totalDeleted,
    errors: errors.length > 0 ? errors : undefined,
    message: `Usunięto ${totalDeleted} z ${allFiles.length} certyfikatów starszych niż 30 dni (fallback)`,
  };

  return new Response(JSON.stringify(result, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
