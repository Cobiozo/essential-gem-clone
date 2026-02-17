import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 20; // Increased for faster processing
const PAGE_SIZE = 1000;
const MAX_EXECUTION_TIME = 25000; // 25 seconds (Supabase limit is 30s)

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

    // Start background processing with global timeout wrapper
    const withGlobalTimeout = (fn: () => Promise<void>, ms: number): Promise<void> => {
      return Promise.race([
        fn(),
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Global execution timeout')), ms)
        )
      ]).catch(error => {
        console.error('Background task error or timeout:', error.message);
      });
    };

    EdgeRuntime.waitUntil(withGlobalTimeout(
      () => processTranslationJob(jobId), 
      55000 // 55 seconds max (Supabase limit is 60s)
    ));

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
    } else if (jobType === 'training') {
      await processTrainingJob(supabase, job, lovableApiKey);
    } else if (jobType === 'knowledge') {
      await processKnowledgeJob(supabase, job, lovableApiKey);
    } else if (jobType === 'healthy_knowledge') {
      await processHealthyKnowledgeJob(supabase, job, lovableApiKey);
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
    await new Promise(resolve => setTimeout(resolve, 100));
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
  const startTime = Date.now();

  // ============ CMS ITEMS ============
  let itemsQuery = supabase
    .from('cms_items')
    .select('id, title, description, cells')
    .eq('is_active', true);
  
  if (page_id) {
    itemsQuery = itemsQuery.eq('page_id', page_id);
  }

  const { data: items, error: itemsError } = await itemsQuery;

  if (itemsError) {
    throw new Error(`Failed to fetch CMS items: ${itemsError.message}`);
  }

  // Filter items with translatable content
  const translatableItems = (items || []).filter(item => 
    item.title || item.description || (item.cells && item.cells.length > 0)
  );

  // Get existing item translations
  const { data: existingItemTranslations } = await supabase
    .from('cms_item_translations')
    .select('item_id')
    .eq('language_code', target_language)
    .not('title', 'is', null);

  const existingItemIds = new Set(existingItemTranslations?.map(t => t.item_id) || []);

  // Filter items based on mode
  const itemsToTranslate = job.mode === 'all' 
    ? translatableItems 
    : translatableItems.filter(item => !existingItemIds.has(item.id));

  // ============ CMS SECTIONS ============
  let sectionsQuery = supabase
    .from('cms_sections')
    .select('id, title, description, collapsible_header')
    .eq('is_active', true);
  
  if (page_id) {
    sectionsQuery = sectionsQuery.eq('page_id', page_id);
  }

  const { data: sections, error: sectionsError } = await sectionsQuery;

  if (sectionsError) {
    console.error(`Failed to fetch CMS sections: ${sectionsError.message}`);
    // Don't throw, continue with items only
  }

  // Filter sections with translatable content
  const translatableSections = (sections || []).filter(section => 
    section.title || section.description || section.collapsible_header
  );

  // Get existing section translations
  const { data: existingSectionTranslations } = await supabase
    .from('cms_section_translations')
    .select('section_id')
    .eq('language_code', target_language)
    .not('title', 'is', null);

  const existingSectionIds = new Set(existingSectionTranslations?.map(t => t.section_id) || []);

  // Filter sections based on mode
  const sectionsToTranslate = job.mode === 'all' 
    ? translatableSections 
    : translatableSections.filter(section => !existingSectionIds.has(section.id));

  // ============ TOTAL COUNT ============
  const totalKeys = itemsToTranslate.length + sectionsToTranslate.length;

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
    console.log('No CMS items or sections to translate');
    return;
  }

  console.log(`Translating ${itemsToTranslate.length} CMS items and ${sectionsToTranslate.length} sections to ${target_language}`);

  let processedKeys = alreadyProcessed;
  let errors = job.errors || 0;

  // ============ PROCESS ITEMS ============
  for (let i = 0; i < itemsToTranslate.length; i += BATCH_SIZE) {
    // Check timeout
    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
      console.log(`Timeout reached after ${Math.round((Date.now() - startTime) / 1000)}s, saving progress`);
      await supabase
        .from('translation_jobs')
        .update({ 
          processed_keys: processedKeys, 
          errors,
          status: 'processing', // Keep as processing for resume
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      return;
    }

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

    // Batch translate all items at once using a single AI call
    try {
      const batchTranslations = await translateCMSItemsBatch(batch, source_language, target_language, lovableApiKey);
      
      for (let idx = 0; idx < batch.length; idx++) {
        const item = batch[idx];
        const translated = batchTranslations[idx] || {};
        
        const { error: upsertError } = await supabase
          .from('cms_item_translations')
          .upsert({
            item_id: item.id,
            language_code: target_language,
            title: translated.title || null,
            description: translated.description || null,
            cells: translated.cells || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'item_id,language_code'
          });

        if (upsertError) {
          console.error(`Failed to save CMS item translation for ${item.id}:`, upsertError);
          errors++;
        } else {
          processedKeys++;
        }
      }
    } catch (batchError) {
      console.error('Batch CMS item translation error:', batchError);
      errors += batch.length;
    }

    await new Promise(resolve => setTimeout(resolve, 100));

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

  // ============ PROCESS SECTIONS ============
  for (let i = 0; i < sectionsToTranslate.length; i += BATCH_SIZE) {
    // Check timeout
    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
      console.log(`Timeout reached after ${Math.round((Date.now() - startTime) / 1000)}s, saving progress`);
      await supabase
        .from('translation_jobs')
        .update({ 
          processed_keys: processedKeys, 
          errors,
          status: 'processing', // Keep as processing for resume
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      return;
    }

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

    const batch = sectionsToTranslate.slice(i, i + BATCH_SIZE);

    // Batch translate all sections at once using a single AI call
    try {
      const batchTranslations = await translateCMSSectionsBatch(batch, source_language, target_language, lovableApiKey);
      
      for (let idx = 0; idx < batch.length; idx++) {
        const section = batch[idx];
        const translated = batchTranslations[idx] || {};
        
        const { error: upsertError } = await supabase
          .from('cms_section_translations')
          .upsert({
            section_id: section.id,
            language_code: target_language,
            title: translated.title || null,
            description: translated.description || null,
            collapsible_header: translated.collapsible_header || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'section_id,language_code'
          });

        if (upsertError) {
          console.error(`Failed to save CMS section translation for ${section.id}:`, upsertError);
          errors++;
        } else {
          processedKeys++;
        }
      }
    } catch (batchError) {
      console.error('Batch CMS section translation error:', batchError);
      errors += batch.length;
    }

    await new Promise(resolve => setTimeout(resolve, 100));

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

  console.log(`CMS Translation job ${jobId} completed. Items: ${itemsToTranslate.length}, Sections: ${sectionsToTranslate.length}, Processed: ${processedKeys}, Errors: ${errors}`);
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

const LANGUAGE_NAMES: Record<string, string> = {
  'pl': 'Polish',
  'de': 'German',
  'en': 'English',
  'it': 'Italian',
  'fr': 'French',
  'es': 'Spanish',
  'pt': 'Portuguese',
  'nl': 'Dutch',
  'cs': 'Czech',
  'sk': 'Slovak',
  'uk': 'Ukrainian',
  'ru': 'Russian',
};

async function aiRequest(apiKey: string, systemPrompt: string, userContent: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
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
            { role: 'user', content: userContent }
          ],
          temperature: 0.3
        }),
      });

      if (!response.ok) {
        if (response.status === 429 && attempt < retries) {
          const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
          console.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        if (response.status === 402) {
          throw new Error('API credits exhausted. Please add more credits.');
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
    } catch (error) {
      if (attempt === retries) throw error;
    }
  }
  return '';
}

// Batch translate multiple CMS items in a single AI call
async function translateCMSItemsBatch(
  items: any[],
  sourceLanguage: string,
  targetLanguage: string,
  apiKey: string | undefined
): Promise<any[]> {
  if (!apiKey || items.length === 0) return items.map(() => ({}));

  const sourceLang = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const targetLang = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  // Build batch payload
  const payload = items.map((item, idx) => ({
    idx,
    title: item.title || null,
    description: item.description || null,
    cells: item.cells?.map((c: any) => ({
      content: c.content || null,
      button_text: c.button_text || null,
      buttonText: c.buttonText || null,
    })) || null
  }));

  const systemPrompt = `You are a professional translator. Translate UI content from ${sourceLang} to ${targetLang}.
Return ONLY a valid JSON array with same structure. Translate only text values (title, description, content, button_text, buttonText). Keep idx unchanged. Preserve HTML tags and placeholders like {name}.`;

  try {
    const content = await aiRequest(apiKey, systemPrompt, JSON.stringify(payload));
    const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    // Map back to items structure
    return items.map((item, idx) => {
      const translated = parsed.find((p: any) => p.idx === idx) || parsed[idx] || {};
      const result: any = {};
      if (translated.title) result.title = translated.title;
      if (translated.description) result.description = translated.description;
      if (translated.cells && item.cells) {
        result.cells = item.cells.map((origCell: any, ci: number) => {
          const tc = translated.cells?.[ci] || {};
          return {
            ...origCell,
            ...(tc.content ? { content: tc.content } : {}),
            ...(tc.button_text ? { button_text: tc.button_text } : {}),
            ...(tc.buttonText ? { buttonText: tc.buttonText } : {}),
          };
        });
      }
      return result;
    });
  } catch (error) {
    console.error('Batch CMS items translation failed:', error);
    return items.map(() => ({}));
  }
}

// Batch translate multiple CMS sections in a single AI call
async function translateCMSSectionsBatch(
  sections: any[],
  sourceLanguage: string,
  targetLanguage: string,
  apiKey: string | undefined
): Promise<any[]> {
  if (!apiKey || sections.length === 0) return sections.map(() => ({}));

  const sourceLang = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const targetLang = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  const payload = sections.map((s, idx) => ({
    idx,
    title: s.title || null,
    description: s.description || null,
    collapsible_header: s.collapsible_header || null,
  }));

  const systemPrompt = `You are a professional translator. Translate UI section headers from ${sourceLang} to ${targetLang}.
Return ONLY a valid JSON array with same structure. Translate only text values. Keep idx unchanged.`;

  try {
    const content = await aiRequest(apiKey, systemPrompt, JSON.stringify(payload));
    const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    return sections.map((_, idx) => {
      const translated = parsed.find((p: any) => p.idx === idx) || parsed[idx] || {};
      return {
        title: translated.title || null,
        description: translated.description || null,
        collapsible_header: translated.collapsible_header || null,
      };
    });
  } catch (error) {
    console.error('Batch CMS sections translation failed:', error);
    return sections.map(() => ({}));
  }
}

async function translateText(text: string, sourceLanguage: string, targetLanguage: string, apiKey: string | undefined): Promise<string> {
  if (!apiKey || !text || text.trim() === '') return text;

  const sourceLang = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const targetLang = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  try {
    return await aiRequest(
      apiKey,
      `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. Return ONLY the translated text, nothing else. Preserve any HTML tags, placeholders like {name}, and formatting.`,
      text
    ) || text;
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

  const sourceLang = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const targetLang = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

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
        console.warn('Rate limited in translateBatch, retrying with backoff...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        // Retry once
        const retryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        if (!retryResponse.ok) return keysObject;
        const retryData = await retryResponse.json();
        const retryContent = retryData.choices?.[0]?.message?.content || '';
        try {
          return JSON.parse(retryContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
        } catch { return keysObject; }
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
    throw error;
  }
}

// ============ TRAINING JOB ============
async function processTrainingJob(supabase: any, job: any, lovableApiKey: string | undefined) {
  const { id: jobId, source_language, target_language } = job;

  // Fetch modules and lessons
  const { data: modules } = await supabase.from('training_modules').select('id, title, description').eq('is_active', true);
  const { data: lessons } = await supabase.from('training_lessons').select('id, title, content, media_alt_text').eq('is_active', true);

  // Get existing translations
  const { data: existModT } = await supabase.from('training_module_translations').select('module_id').eq('language_code', target_language).not('title', 'is', null);
  const { data: existLessT } = await supabase.from('training_lesson_translations').select('lesson_id').eq('language_code', target_language).not('title', 'is', null);

  const existModIds = new Set(existModT?.map((t: any) => t.module_id) || []);
  const existLessIds = new Set(existLessT?.map((t: any) => t.lesson_id) || []);

  const modsToTranslate = job.mode === 'all' ? (modules || []) : (modules || []).filter((m: any) => !existModIds.has(m.id));
  const lessToTranslate = job.mode === 'all' ? (lessons || []) : (lessons || []).filter((l: any) => !existLessIds.has(l.id));

  const totalKeys = modsToTranslate.length + lessToTranslate.length;
  await supabase.from('translation_jobs').update({ total_keys: totalKeys, updated_at: new Date().toISOString() }).eq('id', jobId);

  if (totalKeys === 0) {
    await supabase.from('translation_jobs').update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', jobId);
    return;
  }

  let processedKeys = 0, errors = 0;

  // Translate modules
  for (let i = 0; i < modsToTranslate.length; i += BATCH_SIZE) {
    const batch = modsToTranslate.slice(i, i + BATCH_SIZE);
    try {
      const translated = await translateGenericBatch(batch, ['title', 'description'], source_language, target_language, lovableApiKey);
      for (let idx = 0; idx < batch.length; idx++) {
        const { error } = await supabase.from('training_module_translations').upsert({
          module_id: batch[idx].id, language_code: target_language, ...translated[idx], updated_at: new Date().toISOString()
        }, { onConflict: 'module_id,language_code' });
        if (error) errors++; else processedKeys++;
      }
    } catch { errors += batch.length; }
    await supabase.from('translation_jobs').update({ processed_keys: processedKeys, errors, updated_at: new Date().toISOString() }).eq('id', jobId);
    await new Promise(r => setTimeout(r, 100));
  }

  // Translate lessons
  for (let i = 0; i < lessToTranslate.length; i += BATCH_SIZE) {
    const batch = lessToTranslate.slice(i, i + BATCH_SIZE);
    try {
      const translated = await translateGenericBatch(batch, ['title', 'content', 'media_alt_text'], source_language, target_language, lovableApiKey);
      for (let idx = 0; idx < batch.length; idx++) {
        const { error } = await supabase.from('training_lesson_translations').upsert({
          lesson_id: batch[idx].id, language_code: target_language, ...translated[idx], updated_at: new Date().toISOString()
        }, { onConflict: 'lesson_id,language_code' });
        if (error) errors++; else processedKeys++;
      }
    } catch { errors += batch.length; }
    await supabase.from('translation_jobs').update({ processed_keys: processedKeys, errors, updated_at: new Date().toISOString() }).eq('id', jobId);
    await new Promise(r => setTimeout(r, 100));
  }

  await supabase.from('translation_jobs').update({ status: 'completed', processed_keys: processedKeys, errors, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', jobId);
  console.log(`Training job ${jobId} completed. Processed: ${processedKeys}, Errors: ${errors}`);
}

// ============ KNOWLEDGE JOB ============
async function processKnowledgeJob(supabase: any, job: any, lovableApiKey: string | undefined) {
  const { id: jobId, source_language, target_language } = job;

  const { data: resources } = await supabase.from('knowledge_resources').select('id, title, description, context_of_use');
  const { data: existT } = await supabase.from('knowledge_resource_translations').select('resource_id').eq('language_code', target_language).not('title', 'is', null);
  const existIds = new Set(existT?.map((t: any) => t.resource_id) || []);
  const toTranslate = job.mode === 'all' ? (resources || []) : (resources || []).filter((r: any) => !existIds.has(r.id));

  await supabase.from('translation_jobs').update({ total_keys: toTranslate.length, updated_at: new Date().toISOString() }).eq('id', jobId);

  if (toTranslate.length === 0) {
    await supabase.from('translation_jobs').update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', jobId);
    return;
  }

  let processedKeys = 0, errors = 0;

  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    try {
      const translated = await translateGenericBatch(batch, ['title', 'description', 'context_of_use'], source_language, target_language, lovableApiKey);
      for (let idx = 0; idx < batch.length; idx++) {
        const { error } = await supabase.from('knowledge_resource_translations').upsert({
          resource_id: batch[idx].id, language_code: target_language, ...translated[idx], updated_at: new Date().toISOString()
        }, { onConflict: 'resource_id,language_code' });
        if (error) errors++; else processedKeys++;
      }
    } catch { errors += batch.length; }
    await supabase.from('translation_jobs').update({ processed_keys: processedKeys, errors, updated_at: new Date().toISOString() }).eq('id', jobId);
    await new Promise(r => setTimeout(r, 100));
  }

  await supabase.from('translation_jobs').update({ status: 'completed', processed_keys: processedKeys, errors, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', jobId);
  console.log(`Knowledge job ${jobId} completed. Processed: ${processedKeys}, Errors: ${errors}`);
}

// ============ HEALTHY KNOWLEDGE JOB ============
async function processHealthyKnowledgeJob(supabase: any, job: any, lovableApiKey: string | undefined) {
  const { id: jobId, source_language, target_language } = job;

  const { data: items } = await supabase.from('healthy_knowledge').select('id, title, description, text_content').eq('is_active', true);
  const { data: existT } = await supabase.from('healthy_knowledge_translations').select('item_id').eq('language_code', target_language).not('title', 'is', null);
  const existIds = new Set(existT?.map((t: any) => t.item_id) || []);
  const toTranslate = job.mode === 'all' ? (items || []) : (items || []).filter((i: any) => !existIds.has(i.id));

  await supabase.from('translation_jobs').update({ total_keys: toTranslate.length, updated_at: new Date().toISOString() }).eq('id', jobId);

  if (toTranslate.length === 0) {
    await supabase.from('translation_jobs').update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', jobId);
    return;
  }

  let processedKeys = 0, errors = 0;

  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    try {
      const translated = await translateGenericBatch(batch, ['title', 'description', 'text_content'], source_language, target_language, lovableApiKey);
      for (let idx = 0; idx < batch.length; idx++) {
        const { error } = await supabase.from('healthy_knowledge_translations').upsert({
          item_id: batch[idx].id, language_code: target_language, ...translated[idx], updated_at: new Date().toISOString()
        }, { onConflict: 'item_id,language_code' });
        if (error) errors++; else processedKeys++;
      }
    } catch { errors += batch.length; }
    await supabase.from('translation_jobs').update({ processed_keys: processedKeys, errors, updated_at: new Date().toISOString() }).eq('id', jobId);
    await new Promise(r => setTimeout(r, 100));
  }

  await supabase.from('translation_jobs').update({ status: 'completed', processed_keys: processedKeys, errors, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', jobId);
  console.log(`Healthy Knowledge job ${jobId} completed. Processed: ${processedKeys}, Errors: ${errors}`);
}

// ============ GENERIC BATCH TRANSLATOR ============
async function translateGenericBatch(
  items: any[],
  fields: string[],
  sourceLanguage: string,
  targetLanguage: string,
  apiKey: string | undefined
): Promise<any[]> {
  if (!apiKey || items.length === 0) return items.map(() => ({}));

  const sourceLang = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const targetLang = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  const payload = items.map((item, idx) => {
    const obj: any = { idx };
    for (const f of fields) {
      obj[f] = item[f] || null;
    }
    return obj;
  });

  const systemPrompt = `You are a professional translator. Translate content from ${sourceLang} to ${targetLang}.
Return ONLY a valid JSON array with same structure. Translate only text values. Keep idx unchanged. Preserve HTML tags and placeholders.`;

  try {
    const content = await aiRequest(apiKey, systemPrompt, JSON.stringify(payload));
    const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return items.map((_, idx) => {
      const translated = parsed.find((p: any) => p.idx === idx) || parsed[idx] || {};
      const result: any = {};
      for (const f of fields) {
        if (translated[f]) result[f] = translated[f];
      }
      return result;
    });
  } catch (error) {
    console.error('Generic batch translation failed:', error);
    return items.map(() => ({}));
  }
}
