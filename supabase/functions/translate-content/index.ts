import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, targetLanguage, sourceLanguage } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // If source and target are the same, return original content
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
      
      // Return original content on error
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
