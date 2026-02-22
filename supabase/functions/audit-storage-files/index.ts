import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bucket -> tables that reference files in that bucket
const BUCKET_REFERENCES: Record<string, { table: string; column: string }[]> = {
  'certificates': [
    { table: 'certificates', column: 'file_url' },
  ],
  'cms-videos': [
    { table: 'training_lessons', column: 'media_url' },
    { table: 'cms_items', column: 'media_url' },
  ],
  'cms-images': [
    { table: 'cms_items', column: 'media_url' },
    { table: 'cms_sections', column: 'background_image' },
  ],
  'training-media': [
    { table: 'training_lessons', column: 'media_url' },
  ],
  'healthy-knowledge': [
    { table: 'healthy_knowledge_items', column: 'file_url' },
  ],
  'knowledge-resources': [
    { table: 'knowledge_resources', column: 'file_url' },
  ],
  'cms-files': [
    { table: 'cms_items', column: 'media_url' },
  ],
  'sidebar-icons': [
    { table: 'cms_sections', column: 'icon_name' },
  ],
};

const ALL_BUCKETS = Object.keys(BUCKET_REFERENCES);

interface BucketAuditResult {
  bucket_id: string;
  total_files: number;
  total_bytes: number;
  orphaned_files: number;
  orphaned_bytes: number;
  orphaned_file_paths: string[];
}

async function auditBucket(
  supabaseAdmin: any,
  bucketId: string
): Promise<BucketAuditResult> {
  const result: BucketAuditResult = {
    bucket_id: bucketId,
    total_files: 0,
    total_bytes: 0,
    orphaned_files: 0,
    orphaned_bytes: 0,
    orphaned_file_paths: [],
  };

  // List all files in bucket from storage.objects
  const { data: objects, error: listError } = await supabaseAdmin
    .from('storage_objects_view')
    .select('name, metadata')
    .eq('bucket_id', bucketId);

  // Fallback: query storage.objects directly via RPC if view doesn't exist
  let files: { name: string; size: number }[] = [];

  if (listError) {
    // Use storage API to list files
    const { data: storageFiles, error: storageError } = await supabaseAdmin
      .storage
      .from(bucketId)
      .list('', { limit: 10000 });

    if (storageError) {
      console.error(`[audit-storage] Error listing ${bucketId}:`, storageError.message);
      return result;
    }

    files = (storageFiles || [])
      .filter((f: any) => f.name && !f.name.endsWith('/'))
      .map((f: any) => ({
        name: f.name,
        size: f.metadata?.size || 0,
      }));
  } else {
    files = (objects || []).map((o: any) => ({
      name: o.name,
      size: o.metadata?.size || 0,
    }));
  }

  result.total_files = files.length;
  result.total_bytes = files.reduce((sum, f) => sum + f.size, 0);

  if (files.length === 0) return result;

  // Collect all referenced URLs from related tables
  const refs = BUCKET_REFERENCES[bucketId] || [];
  const referencedFilenames = new Set<string>();

  for (const ref of refs) {
    try {
      const { data: rows, error: refError } = await supabaseAdmin
        .from(ref.table)
        .select(ref.column)
        .not(ref.column, 'is', null);

      if (refError) {
        console.warn(`[audit-storage] Warning querying ${ref.table}.${ref.column}:`, refError.message);
        continue;
      }

      for (const row of rows || []) {
        const url = row[ref.column];
        if (!url || typeof url !== 'string') continue;

        // Extract filename from various URL formats
        // Supabase storage URL: .../storage/v1/object/public/bucket/filename
        // Direct filename reference
        if (url.includes(`/${bucketId}/`)) {
          const parts = url.split(`/${bucketId}/`);
          const filename = parts[parts.length - 1].split('?')[0];
          if (filename) referencedFilenames.add(decodeURIComponent(filename));
        } else {
          // Try just the filename
          const urlParts = url.split('/');
          const filename = urlParts[urlParts.length - 1].split('?')[0];
          if (filename) referencedFilenames.add(decodeURIComponent(filename));
        }
      }
    } catch (e: any) {
      console.warn(`[audit-storage] Error processing ${ref.table}:`, e.message);
    }
  }

  // Find orphaned files
  for (const file of files) {
    const isReferenced = referencedFilenames.has(file.name) ||
      referencedFilenames.has(decodeURIComponent(file.name)) ||
      // Check if any referenced URL contains this filename
      Array.from(referencedFilenames).some(ref => ref.includes(file.name) || file.name.includes(ref));

    if (!isReferenced) {
      result.orphaned_files++;
      result.orphaned_bytes += file.size;
      result.orphaned_file_paths.push(file.name);
    }
  }

  return result;
}

async function cleanupBucket(
  supabaseAdmin: any,
  bucketId: string,
  filePaths: string[]
): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;

  // Delete in batches of 100
  for (let i = 0; i < filePaths.length; i += 100) {
    const batch = filePaths.slice(i, i + 100);
    const { error } = await supabaseAdmin
      .storage
      .from(bucketId)
      .remove(batch);

    if (error) {
      console.error(`[audit-storage] Error deleting batch from ${bucketId}:`, error.message);
      errors += batch.length;
    } else {
      deleted += batch.length;
    }
  }

  return { deleted, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, bucket_name } = body;

    if (action === 'audit') {
      const bucketsToAudit = bucket_name ? [bucket_name] : ALL_BUCKETS;
      const results: BucketAuditResult[] = [];

      for (const bid of bucketsToAudit) {
        if (!BUCKET_REFERENCES[bid]) {
          console.warn(`[audit-storage] Unknown bucket: ${bid}`);
          continue;
        }
        console.log(`[audit-storage] Auditing bucket: ${bid}`);
        const auditResult = await auditBucket(supabaseAdmin, bid);
        results.push(auditResult);
        console.log(`[audit-storage] ${bid}: ${auditResult.total_files} total, ${auditResult.orphaned_files} orphaned (${(auditResult.orphaned_bytes / 1024 / 1024).toFixed(1)} MB)`);
      }

      const totals = {
        total_files: results.reduce((s, r) => s + r.total_files, 0),
        total_bytes: results.reduce((s, r) => s + r.total_bytes, 0),
        orphaned_files: results.reduce((s, r) => s + r.orphaned_files, 0),
        orphaned_bytes: results.reduce((s, r) => s + r.orphaned_bytes, 0),
      };

      return new Response(JSON.stringify({ buckets: results, totals }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'cleanup') {
      if (!bucket_name || !BUCKET_REFERENCES[bucket_name]) {
        return new Response(JSON.stringify({ error: 'Valid bucket_name required for cleanup' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // First audit to get orphaned files
      const audit = await auditBucket(supabaseAdmin, bucket_name);
      if (audit.orphaned_files === 0) {
        return new Response(JSON.stringify({ deleted: 0, errors: 0, message: 'No orphaned files found' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[audit-storage] Cleaning up ${audit.orphaned_files} orphaned files from ${bucket_name}`);
      const result = await cleanupBucket(supabaseAdmin, bucket_name, audit.orphaned_file_paths);

      return new Response(JSON.stringify({
        deleted: result.deleted,
        errors: result.errors,
        freed_bytes: audit.orphaned_bytes,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use audit or cleanup.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('[audit-storage] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
