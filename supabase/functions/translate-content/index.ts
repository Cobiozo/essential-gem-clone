import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, targetLanguage, sourceLanguage, mode, keys } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Mode: 'single' for single text, 'batch' for batch translation of keys
    if (mode === 'batch' && keys) {
      // Batch translation mode for i18n keys
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const languageNames: Record<string, string> = {
        pl: 'Polish',
        de: 'German',
        en: 'English',
        it: 'Italian',
        fr: 'French',
        es: 'Spanish',
        pt: 'Portuguese',
        nl: 'Dutch',
        cs: 'Czech',
        sk: 'Slovak',
        uk: 'Ukrainian',
        ru: 'Russian',
      };

      const targetLangName = languageNames[targetLanguage] || targetLanguage;
      const sourceLangName = languageNames[sourceLanguage] || sourceLanguage;

      // Process in batches of 30 keys
      const batchSize = 30;
      const results: { namespace: string; key: string; value: string }[] = [];
      
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        
        const keysJson = JSON.stringify(batch.map((k: any) => ({
          ns: k.namespace,
          key: k.key,
          value: k.value
        })));

        const systemPrompt = `You are a professional translator. Translate the following JSON array of UI translations from ${sourceLangName} to ${targetLangName}.

RULES:
1. Return ONLY valid JSON array with same structure
2. Translate ONLY the "value" field
3. Keep "ns" and "key" fields unchanged
4. Preserve any placeholders like {name}, {{count}}, %s, %d
5. Keep HTML tags if present
6. Maintain tone and formality appropriate for UI text
7. Return empty string if source is empty

Input format: [{"ns":"namespace","key":"keyname","value":"text to translate"}]
Output format: [{"ns":"namespace","key":"keyname","value":"translated text"}]`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: keysJson }
            ],
            stream: false,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI translation error:', response.status, errorText);
          
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: 'rate_limit', message: 'Rate limit exceeded' }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          continue; // Skip this batch on error
        }

        const data = await response.json();
        let translatedText = data.choices?.[0]?.message?.content || '[]';
        
        // Clean up the response - remove markdown code blocks if present
        translatedText = translatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
          const translated = JSON.parse(translatedText);
          for (const item of translated) {
            if (item.ns && item.key && item.value !== undefined) {
              results.push({
                namespace: item.ns,
                key: item.key,
                value: item.value
              });
            }
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError, translatedText);
        }
      }

      // Save translations to database
      if (results.length > 0) {
        const inserts = results.map(r => ({
          language_code: targetLanguage,
          namespace: r.namespace,
          key: r.key,
          value: r.value
        }));

        const { error: insertError } = await supabase
          .from('i18n_translations')
          .upsert(inserts, { onConflict: 'language_code,namespace,key' });

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw insertError;
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        translated: results.length,
        total: keys.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single text translation mode (original behavior)
    if (sourceLanguage === targetLanguage) {
      return new Response(JSON.stringify({ translatedContent: content }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const languageNames: Record<string, string> = {
      pl: 'Polish',
      de: 'German',
      en: 'English',
      it: 'Italian',
    };

    const targetLangName = languageNames[targetLanguage] || 'English';

    const systemPrompt = `You are a professional medical/scientific translator. Translate the following content to ${targetLangName}.

RULES:
1. Maintain the EXACT same structure and formatting (markdown, links, line breaks)
2. Keep all URLs, DOIs, PMIDs unchanged
3. Preserve technical/medical terms accuracy
4. Keep author names unchanged
5. Translate ONLY the text content, not technical identifiers
6. Maintain scientific accuracy and meaning
7. Return ONLY the translated text, no explanations`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Translation error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'rate_limit' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ translatedContent: content }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const translatedContent = data.choices?.[0]?.message?.content || content;

    return new Response(JSON.stringify({ translatedContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Translate content error:', error);
    return new Response(JSON.stringify({ 
      error: 'server_error', 
      message: error instanceof Error ? error.message : 'Translation failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});