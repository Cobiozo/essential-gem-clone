import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this job is enabled in cron_settings
    const { data: cronSetting } = await supabase
      .from('cron_settings')
      .select('is_enabled')
      .eq('job_name', 'scheduled-translate-sync')
      .single();

    if (cronSetting && !cronSetting.is_enabled) {
      console.log('[scheduled-translate-sync] Job is disabled, skipping');
      return new Response(JSON.stringify({ skipped: true, reason: 'disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all active languages except Polish (source)
    const { data: languages, error: langError } = await supabase
      .from('i18n_languages')
      .select('code')
      .eq('is_active', true)
      .neq('code', 'pl');

    if (langError) throw langError;

    const targetLanguages = languages?.map(l => l.code) || [];

    if (targetLanguages.length === 0) {
      return new Response(JSON.stringify({ message: 'No target languages configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[scheduled-translate-sync] Syncing translations for ${targetLanguages.length} languages: ${targetLanguages.join(', ')}`);

    const jobTypes = ['i18n', 'cms', 'training', 'knowledge', 'healthy_knowledge'];
    const jobsCreated: string[] = [];
    const jobsModes: string[] = [];

    for (const targetLang of targetLanguages) {
      // 1. Create 'missing' jobs for each content type
      for (const jobType of jobTypes) {
        const jobId = await createAndStartJob(supabase, jobType, 'missing', targetLang);
        if (jobId) {
          jobsCreated.push(jobId);
          jobsModes.push(`${jobType}:missing:${targetLang}`);
        }
      }

      // 2. Detect outdated content and create 'outdated' jobs
      for (const jobType of jobTypes) {
        const hasOutdated = await checkForOutdatedContent(supabase, jobType, targetLang);
        if (hasOutdated) {
          const jobId = await createAndStartJob(supabase, jobType, 'outdated', targetLang);
          if (jobId) {
            jobsCreated.push(jobId);
            jobsModes.push(`${jobType}:outdated:${targetLang}`);
          }
        }
      }
    }

    // Log the cron run
    await supabase.from('cron_job_logs').insert({
      job_name: 'scheduled-translate-sync',
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      processed_count: jobsCreated.length,
      details: { jobs_created: jobsCreated, modes: jobsModes },
    });

    console.log(`[scheduled-translate-sync] Created ${jobsCreated.length} translation jobs`);

    return new Response(JSON.stringify({
      success: true,
      jobs_created: jobsCreated.length,
      job_ids: jobsCreated,
      details: jobsModes,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[scheduled-translate-sync] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createAndStartJob(
  supabase: any,
  jobType: string,
  mode: string,
  targetLang: string
): Promise<string | null> {
  try {
    const { data: job, error: jobError } = await supabase
      .from('translation_jobs')
      .insert({
        job_type: jobType,
        source_language: 'pl',
        target_language: targetLang,
        mode,
        status: 'pending',
        total_keys: 0,
        processed_keys: 0,
        errors: 0,
      })
      .select('id')
      .single();

    if (jobError) {
      console.error(`Failed to create ${jobType}:${mode} job for ${targetLang}:`, jobError);
      return null;
    }

    // Trigger background-translate (fire-and-forget)
    try {
      await supabase.functions.invoke('background-translate', {
        body: { jobId: job.id },
      });
      console.log(`Started ${jobType}:${mode} translation job for ${targetLang}: ${job.id}`);
    } catch (err) {
      console.error(`Failed to invoke background-translate for ${jobType}:${mode}:`, err);
    }

    return job.id;
  } catch (err) {
    console.error(`Error creating job ${jobType}:${mode}:${targetLang}:`, err);
    return null;
  }
}

async function checkForOutdatedContent(
  supabase: any,
  jobType: string,
  targetLang: string
): Promise<boolean> {
  try {
    switch (jobType) {
      case 'cms': {
        // Check cms_items where updated_at > translation's updated_at
        const { data } = await supabase.rpc('check_outdated_cms_translations', {
          p_target_lang: targetLang
        });
        // Fallback: manual check if RPC doesn't exist
        if (data === null || data === undefined) {
          return await checkOutdatedManually(supabase, 'cms_items', 'cms_item_translations', 'id', 'item_id', targetLang);
        }
        return (data || 0) > 0;
      }
      case 'training': {
        const hasOutdatedModules = await checkOutdatedManually(supabase, 'training_modules', 'training_module_translations', 'id', 'module_id', targetLang);
        const hasOutdatedLessons = await checkOutdatedManually(supabase, 'training_lessons', 'training_lesson_translations', 'id', 'lesson_id', targetLang);
        return hasOutdatedModules || hasOutdatedLessons;
      }
      case 'knowledge': {
        return await checkOutdatedManually(supabase, 'knowledge_resources', 'knowledge_resource_translations', 'id', 'resource_id', targetLang);
      }
      case 'healthy_knowledge': {
        return await checkOutdatedManually(supabase, 'healthy_knowledge', 'healthy_knowledge_translations', 'id', 'item_id', targetLang);
      }
      case 'i18n': {
        // i18n keys rarely change, but check anyway
        return await checkOutdatedManually(supabase, 'i18n_translations', null, null, null, targetLang);
      }
      default:
        return false;
    }
  } catch (err) {
    console.error(`Error checking outdated for ${jobType}:${targetLang}:`, err);
    return false;
  }
}

async function checkOutdatedManually(
  supabase: any,
  sourceTable: string,
  translationTable: string | null,
  sourceIdCol: string | null,
  translationFkCol: string | null,
  targetLang: string
): Promise<boolean> {
  if (!translationTable || !sourceIdCol || !translationFkCol) return false;

  // Get a sample of recently updated source records
  const { data: recentSources } = await supabase
    .from(sourceTable)
    .select('id, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (!recentSources || recentSources.length === 0) return false;

  const sourceIds = recentSources.map((s: any) => s.id);

  // Get corresponding translations
  const { data: translations } = await supabase
    .from(translationTable)
    .select(`${translationFkCol}, updated_at`)
    .eq('language_code', targetLang)
    .in(translationFkCol, sourceIds);

  if (!translations) return false;

  const translationMap = new Map(translations.map((t: any) => [t[translationFkCol], t.updated_at]));

  // Check if any source was updated after its translation
  for (const source of recentSources) {
    const translationUpdated = translationMap.get(source.id);
    if (translationUpdated && new Date(source.updated_at) > new Date(translationUpdated)) {
      return true;
    }
  }

  return false;
}
