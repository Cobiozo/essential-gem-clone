import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 10;
const PAGE_SIZE = 1000;

// Paginated fetch to overcome Supabase's 1000 row limit
async function fetchAllRows(
  supabase: any, 
  table: string, 
  column: string, 
  value: string,
  selectColumns: string = '*'
): Promise<any[]> {
  const allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select(selectColumns)
      .eq(column, value)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
    
    if (data && data.length > 0) {
      allData.push(...data);
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  console.log(`Fetched ${allData.length} rows from ${table} for ${column}=${value}`);
  return allData;
}

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

    const jobType = job.job_type || 'i18n';

    if (jobType === 'cms') {
      await processCMSJob(supabase, job, lovableApiKey);
    } else {
      await processI18nJob(supabase, job, lovableApiKey);
    }

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

async function processI18nJob(supabase: any, job: any, lovableApiKey: string | undefined) {
  const { id: jobId, source_language, target_language, mode, processed_keys: alreadyProcessed = 0 } = job;

  // Get all translations for source language (with pagination)
  const sourceTranslations = await fetchAllRows(
    supabase, 
    'i18n_translations', 
    'language_code', 
    source_language,
    '*'
  );

  // Get existing translations for target language (with pagination)
  const existingTranslations = await fetchAllRows(
    supabase,
    'i18n_translations',
    'language_code', 
    target_language,
    'key, namespace'
  );

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

  // Resume from where we left off
  let processedKeys = alreadyProcessed;
  let errors = job.errors || 0;
  const startIndex = alreadyProcessed;

  // Process in batches
  for (let i = startIndex; i < keysToTranslate.length; i += BATCH_SIZE) {
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
}

async function processCMSJob(supabase: any, job: any, lovableApiKey: string | undefined) {
  const { id: jobId, source_language, target_language, page_id, processed_keys: alreadyProcessed = 0 } = job;

  // Get CMS items to translate
  let query = supabase
    .from('cms_items')
    .select('id, title, description, cells')
    .eq('is_active', true);
  
  if (page_id) {
    query = query.eq('page_id', page_id);
  }

  const { data: items, error: itemsError } = await query;

  if (itemsError) {
    throw new Error(`Failed to fetch CMS items: ${itemsError.message}`);
  }

  // Filter items with translatable content
  const translatableItems = (items || []).filter(item => 
    item.title || item.description || (item.cells && item.cells.length > 0)
  );

  // Get existing translations
  const { data: existingTranslations } = await supabase
    .from('cms_item_translations')
    .select('item_id')
    .eq('language_code', target_language);

  const existingItemIds = new Set(existingTranslations?.map(t => t.item_id) || []);

  // Filter based on mode: 'all' translates everything, 'missing' only untranslated
  const itemsToTranslate = job.mode === 'all' 
    ? translatableItems 
    : translatableItems.filter(item => !existingItemIds.has(item.id));

  const totalKeys = itemsToTranslate.length;

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
    console.log('No CMS items to translate');
    return;
  }

  console.log(`Translating ${totalKeys} CMS items to ${target_language}`);

  let processedKeys = alreadyProcessed;
  let errors = job.errors || 0;

  // Process in batches
  for (let i = alreadyProcessed; i < itemsToTranslate.length; i += BATCH_SIZE) {
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

    const batch = itemsToTranslate.slice(i, i + BATCH_SIZE);

    for (const item of batch) {
      try {
        const translations: any = {};
        
        // Translate title
        if (item.title) {
          const titleResult = await translateText(item.title, source_language, target_language, lovableApiKey);
          translations.title = titleResult;
        }

        // Translate description
        if (item.description) {
          const descResult = await translateText(item.description, source_language, target_language, lovableApiKey);
          translations.description = descResult;
        }

        // Translate cells content
        if (item.cells && Array.isArray(item.cells)) {
          const translatedCells = await translateCells(item.cells, source_language, target_language, lovableApiKey);
          translations.cells = translatedCells;
        }

        // Save translation
        const { error: upsertError } = await supabase
          .from('cms_item_translations')
          .upsert({
            item_id: item.id,
            language_code: target_language,
            title: translations.title || null,
            description: translations.description || null,
            cells: translations.cells || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'item_id,language_code'
          });

        if (upsertError) {
          console.error(`Failed to save CMS translation for ${item.id}:`, upsertError);
          errors++;
        } else {
          processedKeys++;
        }
      } catch (itemError) {
        console.error(`Error translating CMS item ${item.id}:`, itemError);
        errors++;
      }

      // Small delay between items
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Update progress after each batch
    await supabase
      .from('translation_jobs')
      .update({ 
        processed_keys: processedKeys, 
        errors,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
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

  console.log(`CMS Translation job ${jobId} completed. Processed: ${processedKeys}, Errors: ${errors}`);
}

async function translateCells(cells: any[], sourceLanguage: string, targetLanguage: string, apiKey: string | undefined): Promise<any[]> {
  if (!Array.isArray(cells) || cells.length === 0) return cells;

  const translatedCells = [];
  
  for (const cell of cells) {
    const translatedCell = { ...cell };
    
    // Translate content field if it exists and is a string
    if (cell.content && typeof cell.content === 'string') {
      translatedCell.content = await translateText(cell.content, sourceLanguage, targetLanguage, apiKey);
    }
    
    // Translate button_text if exists
    if (cell.button_text && typeof cell.button_text === 'string') {
      translatedCell.button_text = await translateText(cell.button_text, sourceLanguage, targetLanguage, apiKey);
    }
    
    translatedCells.push(translatedCell);
  }
  
  return translatedCells;
}

async function translateText(text: string, sourceLanguage: string, targetLanguage: string, apiKey: string | undefined): Promise<string> {
  if (!apiKey || !text || text.trim() === '') {
    return text;
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
          { 
            role: 'system', 
            content: `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. Return ONLY the translated text, nothing else. Preserve any HTML tags, placeholders like {name}, and formatting.`
          },
          { role: 'user', content: text }
        ],
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Rate limited, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return text;
      }
      if (response.status === 402) {
        console.error('API credits exhausted (402). Stopping translation.');
        throw new Error('API credits exhausted. Please add more credits.');
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
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
        await new Promise(resolve => setTimeout(resolve, 3000));
        return keysObject;
      }
      if (response.status === 402) {
        console.error('API credits exhausted (402). Stopping translation.');
        throw new Error('API credits exhausted. Please add more credits.');
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
    throw error; // Re-throw to stop job on credits error
  }
}
