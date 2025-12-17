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
    const { tone = 'supportive' } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const toneDescriptions: Record<string, string> = {
      supportive: 'wspierający, budujący poczucie bezpieczeństwa i zaufania',
      motivational: 'delikatnie motywujący, bez nachalności i presji',
      calm: 'spokojny, wyciszający, przywracający równowagę'
    };

    const toneDesc = toneDescriptions[tone] || toneDescriptions.supportive;

    const systemPrompt = `Jesteś twórcą spokojnych, wspierających "Sygnałów Dnia" dla platformy wellness Pure Life.

ZASADY BEZWZGLĘDNE:
- Jedno zdanie główne (max 15 słów)
- Jedno zdanie wyjaśniające "dlaczego dziś ten sygnał" (max 20 słów)
- Ton: ${toneDesc}
- Język: dojrzały, spokojny, uniwersalny, wspierający
- ZAKAZ: presja, oceny, sformułowania sprzedażowe, nachalność, banalne motywacyjne hasła
- CEL: świadomy moment startu dnia, budowanie zaufania do platformy

Odpowiedz TYLKO w formacie JSON:
{
  "main_message": "treść główna",
  "explanation": "dlaczego dziś ten sygnał"
}`;

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
          { role: "user", content: "Wygeneruj nowy Sygnał Dnia." }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
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

    const parsedSignal = JSON.parse(jsonContent);

    console.log("Generated signal:", parsedSignal);

    return new Response(JSON.stringify(parsedSignal), {
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
