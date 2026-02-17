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

    const { type, item_id, language_code } = await req.json();

    console.log(`[auto-translate-content] type=${type}, item_id=${item_id}, language_code=${language_code}`);

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

    const jobsCreated: string[] = [];

    if (type === 'new_language') {
      // New language added — translate ALL content types to that language
      if (!language_code) {
        return new Response(JSON.stringify({ error: 'language_code required for new_language type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const jobTypes = ['i18n', 'cms', 'training', 'knowledge', 'healthy_knowledge'];
      
      for (const jobType of jobTypes) {
        const { data: job, error: jobError } = await supabase
          .from('translation_jobs')
          .insert({
            job_type: jobType,
            source_language: 'pl',
            target_language: language_code,
            mode: 'missing',
            status: 'pending',
            total_keys: 0,
            processed_keys: 0,
            errors: 0,
          })
          .select('id')
          .single();

        if (jobError) {
          console.error(`Failed to create ${jobType} job:`, jobError);
          continue;
        }

        // Trigger background-translate
        try {
          await supabase.functions.invoke('background-translate', {
            body: { jobId: job.id },
          });
          jobsCreated.push(job.id);
          console.log(`Started ${jobType} translation job: ${job.id}`);
        } catch (err) {
          console.error(`Failed to invoke background-translate for ${jobType}:`, err);
        }
      }
    } else {
      // New content added — translate to all active languages
      const jobTypeMap: Record<string, string> = {
        training_module: 'training',
        training_lesson: 'training',
        knowledge_resource: 'knowledge',
        healthy_knowledge: 'healthy_knowledge',
      };

      const jobType = jobTypeMap[type];
      if (!jobType) {
        return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      for (const targetLang of targetLanguages) {
        const { data: job, error: jobError } = await supabase
          .from('translation_jobs')
          .insert({
            job_type: jobType,
            source_language: 'pl',
            target_language: targetLang,
            mode: 'missing', // Only translate what's missing (new content)
            status: 'pending',
            total_keys: 0,
            processed_keys: 0,
            errors: 0,
          })
          .select('id')
          .single();

        if (jobError) {
          console.error(`Failed to create job for ${targetLang}:`, jobError);
          continue;
        }

        try {
          await supabase.functions.invoke('background-translate', {
            body: { jobId: job.id },
          });
          jobsCreated.push(job.id);
          console.log(`Started ${jobType} translation to ${targetLang}: ${job.id}`);
        } catch (err) {
          console.error(`Failed to invoke background-translate for ${targetLang}:`, err);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      jobs_created: jobsCreated.length,
      job_ids: jobsCreated 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[auto-translate-content] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
