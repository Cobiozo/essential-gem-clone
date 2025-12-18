import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 10;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Job ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting background translation job: ${jobId}`);

    // Start background processing
    EdgeRuntime.waitUntil(processTranslationJob(jobId));

    return new Response(JSON.stringify({ started: true, jobId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error starting background translation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processTranslationJob(jobId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('translation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return;
    }

    // Check if job was cancelled
    if (job.status === 'cancelled') {
      console.log('Job was cancelled, stopping');
      return;
    }

    // Update job status to processing
    await supabase
      .from('translation_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    const { source_language, target_language, mode } = job;

    // Get all translations for source language
    const { data: sourceTranslations, error: sourceError } = await supabase
      .from('i18n_translations')
      .select('*')
      .eq('language_code', source_language);

    if (sourceError) {
      throw new Error(`Failed to fetch source translations: ${sourceError.message}`);
    }

    // Get existing translations for target language
    const { data: existingTranslations, error: existingError } = await supabase
      .from('i18n_translations')
      .select('key, namespace')
      .eq('language_code', target_language);

    if (existingError) {
      throw new Error(`Failed to fetch existing translations: ${existingError.message}`);
    }

    const existingKeys = new Set(existingTranslations?.map(t => `${t.namespace}:${t.key}`) || []);

    // Filter keys to translate based on mode
    let keysToTranslate = sourceTranslations || [];
    if (mode === 'missing') {
      keysToTranslate = keysToTranslate.filter(t => !existingKeys.has(`${t.namespace}:${t.key}`));
    }

    const totalKeys = keysToTranslate.length;

    // Update total keys
    await supabase
      .from('translation_jobs')
      .update({ total_keys: totalKeys, updated_at: new Date().toISOString() })
      .eq('id', jobId);

    if (totalKeys === 0) {
      await supabase
        .from('translation_jobs')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      console.log('No keys to translate');
      return;
    }

    console.log(`Translating ${totalKeys} keys from ${source_language} to ${target_language}`);

    let processedKeys = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < keysToTranslate.length; i += BATCH_SIZE) {
      // Check if job was cancelled
      const { data: currentJob } = await supabase
        .from('translation_jobs')
        .select('status')
        .eq('id', jobId)
        .single();

      if (currentJob?.status === 'cancelled') {
        console.log('Job was cancelled, stopping');
        return;
      }

      const batch = keysToTranslate.slice(i, i + BATCH_SIZE);
      
      try {
        // Prepare batch for AI translation
        const keysObject: Record<string, string> = {};
        batch.forEach(t => {
          keysObject[`${t.namespace}.${t.key}`] = t.value;
        });

        // Call AI for translation
        const translatedKeys = await translateBatch(keysObject, source_language, target_language, lovableApiKey);

        // Save translations to database
        for (const t of batch) {
          const fullKey = `${t.namespace}.${t.key}`;
          const translatedValue = translatedKeys[fullKey] || t.value;

          const { error: upsertError } = await supabase
            .from('i18n_translations')
            .upsert({
              language_code: target_language,
              namespace: t.namespace,
              key: t.key,
              value: translatedValue,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'language_code,namespace,key'
            });

          if (upsertError) {
            console.error(`Failed to save translation for ${fullKey}:`, upsertError);
            errors++;
          } else {
            processedKeys++;
          }
        }
      } catch (batchError) {
        console.error('Batch translation error:', batchError);
        errors += batch.length;
      }

      // Update progress
      await supabase
        .from('translation_jobs')
        .update({ 
          processed_keys: processedKeys, 
          errors,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Mark job as completed
    await supabase
      .from('translation_jobs')
      .update({ 
        status: 'completed', 
        processed_keys: processedKeys,
        errors,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`Translation job ${jobId} completed. Processed: ${processedKeys}, Errors: ${errors}`);

  } catch (error) {
    console.error('Translation job failed:', error);
    
    await supabase
      .from('translation_jobs')
      .update({ 
        status: 'failed', 
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

async function translateBatch(
  keysObject: Record<string, string>,
  sourceLanguage: string,
  targetLanguage: string,
  apiKey: string | undefined
): Promise<Record<string, string>> {
  if (!apiKey) {
    console.warn('No API key, returning original values');
    return keysObject;
  }

  const languageNames: Record<string, string> = {
    'pl': 'Polish',
    'de': 'German',
    'en': 'English',
    'it': 'Italian',
    'fr': 'French',
    'es': 'Spanish'
  };

  const sourceLang = languageNames[sourceLanguage] || sourceLanguage;
  const targetLang = languageNames[targetLanguage] || targetLanguage;

  const systemPrompt = `You are a professional translator for UI/UX applications. Translate the following i18n keys from ${sourceLang} to ${targetLang}. 
Rules:
- Keep the translation natural and appropriate for UI elements
- Preserve any placeholders like {name}, {{count}}, etc.
- Keep technical terms if they're commonly used in the target language
- For short labels, keep them concise
- Return ONLY a valid JSON object with the same keys but translated values
- Do not add any explanation or markdown`;

  const userPrompt = `Translate these keys:\n${JSON.stringify(keysObject, null, 2)}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Rate limited, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return keysObject;
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Clean up markdown if present
    let cleanJson = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      return JSON.parse(cleanJson);
    } catch {
      console.error('Failed to parse AI response:', content);
      return keysObject;
    }
  } catch (error) {
    console.error('Translation API error:', error);
    return keysObject;
  }
}
