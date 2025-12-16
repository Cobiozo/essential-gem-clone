import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      contactTypeId, 
      stageId, 
      contextDescription, 
      lastContactDays,
      userId,
      language = 'pl'
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch contact type and stage names
    let contactTypeName = "Nieznany";
    let stageName = "Nieznany";

    if (contactTypeId) {
      const { data: contactType } = await supabase
        .from('ai_compass_contact_types')
        .select('name')
        .eq('id', contactTypeId)
        .single();
      if (contactType) contactTypeName = contactType.name;
    }

    if (stageId) {
      const { data: stage } = await supabase
        .from('ai_compass_contact_stages')
        .select('name')
        .eq('id', stageId)
        .single();
      if (stage) stageName = stage.name;
    }

    // Fetch learning patterns for context
    const { data: patterns } = await supabase
      .from('ai_compass_learning_patterns')
      .select('*')
      .eq('contact_type_id', contactTypeId)
      .eq('stage_id', stageId)
      .order('success_rate', { ascending: false })
      .limit(3);

    // Fetch recommended resources
    const { data: resources } = await supabase
      .from('knowledge_resources')
      .select('id, title, description, category')
      .eq('status', 'active')
      .limit(10);

    // Fetch user's reflinks
    const { data: reflinks } = await supabase
      .from('reflinks')
      .select('reflink_code, title, link_url')
      .eq('is_active', true)
      .limit(5);

    // Fetch settings for system prompt
    const { data: settings } = await supabase
      .from('ai_compass_settings')
      .select('ai_system_prompt')
      .single();

    const systemPrompt = `${settings?.ai_system_prompt || 'Jesteś asystentem wspierającym decyzje biznesowe.'}

ZASADY:
1. Podejmujesz JEDNĄ decyzję: "ACT" (DZIAŁAJ) lub "WAIT" (POCZEKAJ)
2. Jeśli decyzja to ACT, generujesz gotową wiadomość follow-up
3. Dobierasz najlepszy zasób z dostępnej bazy wiedzy
4. Sugerujesz użycie reflinka partnerskiego

KONTEKST UCZENIA (wzorce sukcesu z historii):
${patterns?.map(p => `- Typ: ${p.pattern_type}, Optymalny czas: ${p.optimal_timing_days} dni, Skuteczność: ${p.success_rate}%`).join('\n') || 'Brak danych historycznych'}

DOSTĘPNE ZASOBY:
${resources?.map(r => `- [${r.id}] ${r.title}: ${r.description || 'Brak opisu'}`).join('\n') || 'Brak zasobów'}

DOSTĘPNE REFLINKI:
${reflinks?.map(r => `- ${r.title}: ${r.reflink_code}`).join('\n') || 'Brak reflinków'}

Odpowiadaj w formacie JSON:
{
  "decision": "ACT" lub "WAIT",
  "reasoning": "Krótkie uzasadnienie decyzji",
  "message": "Gotowa wiadomość follow-up (tylko jeśli ACT)",
  "resourceId": "ID rekomendowanego zasobu lub null",
  "reflink": "Kod reflinka do użycia lub null",
  "waitDays": "Liczba dni do czekania (tylko jeśli WAIT)"
}`;

    const userPrompt = `Typ kontaktu: ${contactTypeName}
Etap: ${stageName}
Czas od ostatniego kontaktu: ${lastContactDays || 'nieznany'} dni
Kontekst rozmowy: ${contextDescription}

Przeanalizuj sytuację i podejmij decyzję.`;

    console.log("Sending request to AI Gateway...");

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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    console.log("AI Response:", content);

    // Parse JSON from AI response
    let parsedResponse;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsedResponse = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      parsedResponse = {
        decision: "WAIT",
        reasoning: content,
        message: null,
        resourceId: null,
        reflink: null,
        waitDays: 3
      };
    }

    // Save session to database
    const { data: session, error: sessionError } = await supabase
      .from('ai_compass_sessions')
      .insert({
        user_id: userId,
        contact_type_id: contactTypeId,
        stage_id: stageId,
        context_description: contextDescription,
        last_contact_days: lastContactDays,
        ai_decision: parsedResponse.decision,
        ai_reasoning: parsedResponse.reasoning,
        generated_message: parsedResponse.message,
        recommended_resource_id: parsedResponse.resourceId,
        generated_reflink: parsedResponse.reflink,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Failed to save session:", sessionError);
    }

    // Update learning patterns (anonymous aggregation)
    if (contactTypeId && stageId) {
      const { data: existingPattern } = await supabase
        .from('ai_compass_learning_patterns')
        .select('*')
        .eq('contact_type_id', contactTypeId)
        .eq('stage_id', stageId)
        .eq('pattern_type', 'neutral')
        .single();

      if (existingPattern) {
        await supabase
          .from('ai_compass_learning_patterns')
          .update({
            sample_count: existingPattern.sample_count + 1,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingPattern.id);
      } else {
        await supabase
          .from('ai_compass_learning_patterns')
          .insert({
            contact_type_id: contactTypeId,
            stage_id: stageId,
            pattern_type: 'neutral',
            optimal_timing_days: lastContactDays,
            sample_count: 1
          });
      }
    }

    return new Response(JSON.stringify({
      ...parsedResponse,
      sessionId: session?.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in ai-compass function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
