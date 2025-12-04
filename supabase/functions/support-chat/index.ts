import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language = 'pl' } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Create Supabase client to fetch context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch app context from database
    const [pagesResult, modulesResult] = await Promise.all([
      supabase.from('pages').select('title, slug, meta_description').eq('is_published', true).eq('is_active', true).limit(20),
      supabase.from('training_modules').select('title, description').eq('is_active', true).limit(20)
    ]);

    const pages = pagesResult.data || [];
    const modules = modulesResult.data || [];

    // Build context about the application
    const pagesContext = pages.map(p => `- ${p.title} (/page/${p.slug}): ${p.meta_description || 'Brak opisu'}`).join('\n');
    const modulesContext = modules.map(m => `- ${m.title}: ${m.description || 'Brak opisu'}`).join('\n');

    const languageInstructions = {
      pl: 'Odpowiadaj zawsze po polsku.',
      de: 'Antworte immer auf Deutsch.',
      en: 'Always respond in English.'
    };

    const systemPrompt = `Jesteś pomocnym asystentem wsparcia aplikacji Pure Life - platformy do zarządzania treścią i szkoleń.

${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.pl}

## O aplikacji Pure Life:
Pure Life to platforma CMS z systemem szkoleń online. Użytkownicy mogą:
- Przeglądać strony informacyjne
- Uczestniczyć w szkoleniach i zdobywać certyfikaty
- Zarządzać swoim kontem

## Dostępne strony:
${pagesContext || 'Brak opublikowanych stron'}

## Dostępne szkolenia:
${modulesContext || 'Brak aktywnych szkoleń'}

## Nawigacja:
- Strona główna: /
- Moje konto: /my-account
- Akademia szkoleń: /training
- Logowanie: /auth

## Zasady odpowiedzi:
1. Bądź pomocny i przyjazny
2. Jeśli użytkownik pyta o konkretną stronę lub szkolenie, podaj link
3. Odpowiadaj zwięźle, ale treściwie
4. Jeśli nie znasz odpowiedzi, powiedz szczerze i zaproponuj kontakt z administracją
5. Formatuj odpowiedzi używając markdown gdy to pomocne`;

    console.log('Calling Lovable AI Gateway with streaming...');

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
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'rate_limit', message: 'Zbyt wiele zapytań. Spróbuj ponownie za chwilę.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'payment_required', message: 'Usługa AI jest tymczasowo niedostępna.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Support chat error:', error);
    return new Response(JSON.stringify({ 
      error: 'server_error', 
      message: error instanceof Error ? error.message : 'Wystąpił błąd serwera' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
