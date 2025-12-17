import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratedSignal {
  main_message: string;
  explanation: string;
  signal_type: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tone = 'supportive', count = 1 } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const toneDescriptions: Record<string, string> = {
      supportive: 'wspierający, budujący poczucie bezpieczeństwa i zaufania',
      motivational: 'delikatnie motywujący, bez nachalności i presji',
      calm: 'spokojny, wyciszający, przywracający równowagę'
    };

    const tonePolish: Record<string, string> = {
      supportive: 'wspierający',
      motivational: 'motywacyjny',
      calm: 'spokojny'
    };

    const toneDesc = toneDescriptions[tone] || toneDescriptions.supportive;
    const signalCount = Math.min(Math.max(1, count), 50); // Limit to 1-50

    const systemPrompt = `Jesteś twórcą spokojnych, wspierających "Sygnałów Dnia" dla platformy wellness Pure Life.

ZASADY BEZWZGLĘDNE:
- Jedno zdanie główne (max 15 słów)
- Jedno zdanie wyjaśniające "dlaczego dziś ten sygnał" (max 20 słów)
- Ton: ${toneDesc}
- Typ sygnału: ${tonePolish[tone] || 'wspierający'}
- Język: dojrzały, spokojny, uniwersalny, wspierający
- ZAKAZ: presja, oceny, sformułowania sprzedażowe, nachalność, banalne motywacyjne hasła
- CEL: świadomy moment startu dnia, budowanie zaufania do platformy

${signalCount > 1 ? `Wygeneruj DOKŁADNIE ${signalCount} RÓŻNYCH sygnałów. Każdy musi być unikalny i niepowtarzalny.` : ''}

Odpowiedz TYLKO w formacie JSON${signalCount > 1 ? ' (tablica obiektów)' : ''}:
${signalCount > 1 ? `[
  {
    "main_message": "treść główna 1",
    "explanation": "dlaczego dziś ten sygnał 1"
  },
  {
    "main_message": "treść główna 2",
    "explanation": "dlaczego dziś ten sygnał 2"
  }
  // ... itd dla wszystkich ${signalCount} sygnałów
]` : `{
  "main_message": "treść główna",
  "explanation": "dlaczego dziś ten sygnał"
}`}`;

    console.log(`Generating ${signalCount} signals with tone: ${tone}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: signalCount > 1 
            ? `Wygeneruj ${signalCount} unikalnych Sygnałów Dnia o tonie ${tonePolish[tone] || 'wspierającym'}.` 
            : "Wygeneruj nowy Sygnał Dnia." 
          }
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Przekroczono limit zapytań AI. Spróbuj ponownie za chwilę." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Wymagane doładowanie kredytów AI." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonContent = content;
    if (content.includes('```json')) {
      jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (content.includes('```')) {
      jsonContent = content.replace(/```\n?/g, '').trim();
    }

    const parsedContent = JSON.parse(jsonContent);

    // Normalize to array and add signal_type
    let signals: GeneratedSignal[];
    if (Array.isArray(parsedContent)) {
      signals = parsedContent.map((s: any) => ({
        main_message: s.main_message,
        explanation: s.explanation,
        signal_type: tone
      }));
    } else {
      signals = [{
        main_message: parsedContent.main_message,
        explanation: parsedContent.explanation,
        signal_type: tone
      }];
    }

    console.log(`Generated ${signals.length} signals:`, signals);

    // Return single signal or array based on request
    if (signalCount === 1) {
      return new Response(JSON.stringify(signals[0]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ signals }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating daily signal:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
