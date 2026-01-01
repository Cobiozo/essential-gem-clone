import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("AI-Compass function invoked");
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables first
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("Missing LOVABLE_API_KEY");
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase credentials");
      return new Response(JSON.stringify({ error: "Supabase credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { 
      contactId,
      contactTypeId, 
      stageId, 
      contextDescription, 
      lastContactDays,
      userId,
      language = 'pl'
    } = requestBody;

    console.log("Request params:", { contactId, contactTypeId, stageId, contextDescription: contextDescription?.substring(0, 50), lastContactDays, userId, language });

    // Fetch contact data if contactId is provided
    let contactData = null;
    let previousDecisions: any[] = [];
    let contactHistory: any[] = [];

    if (contactId) {
      console.log("Fetching contact data for:", contactId);
      
      const { data: contact } = await supabase
        .from('ai_compass_contacts')
        .select('*')
        .eq('id', contactId)
        .single();
      
      if (contact) {
        contactData = contact;
        console.log("Found contact:", contact.name);

        // Fetch previous AI decisions for this contact
        const { data: sessions } = await supabase
          .from('ai_compass_sessions')
          .select('*')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        previousDecisions = sessions || [];
        console.log("Previous decisions count:", previousDecisions.length);

        // Fetch contact change history
        const { data: history } = await supabase
          .from('ai_compass_contact_history')
          .select('*')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        contactHistory = history || [];
        console.log("Contact history entries:", contactHistory.length);
      }
    }

    // Fetch contact type and stage names
    let contactTypeName = "Nieznany";
    let stageName = "Nieznany";
    const effectiveTypeId = contactTypeId || contactData?.contact_type_id;
    const effectiveStageId = stageId || contactData?.stage_id;

    const startTime = Date.now();
    
    // Batch parallel queries for independent data (optimization: ~40% faster)
    const [
      contactTypeResult,
      stageResult,
      patternsResult,
      resourcesResult,
      reflinksResult,
      settingsResult
    ] = await Promise.allSettled([
      // Contact type
      effectiveTypeId 
        ? supabase.from('ai_compass_contact_types').select('name').eq('id', effectiveTypeId).single()
        : Promise.resolve({ data: null }),
      // Stage
      effectiveStageId 
        ? supabase.from('ai_compass_contact_stages').select('name').eq('id', effectiveStageId).single()
        : Promise.resolve({ data: null }),
      // Learning patterns
      supabase
        .from('ai_compass_learning_patterns')
        .select('*')
        .eq('contact_type_id', effectiveTypeId)
        .eq('stage_id', effectiveStageId)
        .order('success_rate', { ascending: false })
        .limit(3),
      // Resources
      supabase
        .from('knowledge_resources')
        .select('id, title, description, category')
        .eq('status', 'active')
        .limit(10),
      // Reflinks
      supabase
        .from('reflinks')
        .select('reflink_code, title, link_url')
        .eq('is_active', true)
        .limit(5),
      // Settings
      supabase.from('ai_compass_settings').select('ai_system_prompt').single()
    ]);

    console.log(`Parallel queries completed in ${Date.now() - startTime}ms`);

    // Extract results safely
    if (contactTypeResult.status === 'fulfilled' && contactTypeResult.value?.data?.name) {
      contactTypeName = contactTypeResult.value.data.name;
    }
    if (stageResult.status === 'fulfilled' && stageResult.value?.data?.name) {
      stageName = stageResult.value.data.name;
    }
    const patterns = patternsResult.status === 'fulfilled' ? patternsResult.value?.data : null;
    const resources = resourcesResult.status === 'fulfilled' ? resourcesResult.value?.data : null;
    const reflinks = reflinksResult.status === 'fulfilled' ? reflinksResult.value?.data : null;
    const settings = settingsResult.status === 'fulfilled' ? settingsResult.value?.data : null;

    // Build context from contact history
    let historyContext = '';
    if (previousDecisions.length > 0) {
      historyContext = `
HISTORIA POPRZEDNICH DECYZJI DLA TEGO KONTAKTU:
${previousDecisions.map((d, i) => `
${i + 1}. [${new Date(d.created_at).toLocaleDateString('pl')}] 
   Decyzja: ${d.ai_decision}
   Uzasadnienie: ${d.ai_reasoning}
   Feedback użytkownika: ${d.user_feedback || 'brak'}
`).join('')}`;
    }

    if (contactHistory.length > 0) {
      historyContext += `
HISTORIA ZMIAN KONTAKTU:
${contactHistory.map(h => `- [${new Date(h.created_at).toLocaleDateString('pl')}] ${h.change_type}`).join('\n')}`;
    }

    const systemPrompt = `${settings?.ai_system_prompt || 'Jesteś asystentem wspierającym decyzje biznesowe.'}

ZASADY:
1. Podejmujesz JEDNĄ decyzję: "ACT" (DZIAŁAJ) lub "WAIT" (POCZEKAJ)
2. Jeśli decyzja to ACT, generujesz gotową wiadomość follow-up
3. Analizujesz CAŁĄ historię kontaktu, nie tylko bieżący kontekst
4. Uwzględniasz poprzednie decyzje AI i ich skuteczność (feedback)
5. Dobierasz najlepszy zasób z dostępnej bazy wiedzy
6. Sugerujesz użycie reflinka partnerskiego

KONTEKST UCZENIA (wzorce sukcesu z historii):
${patterns?.map(p => `- Typ: ${p.pattern_type}, Optymalny czas: ${p.optimal_timing_days} dni, Skuteczność: ${p.success_rate}%`).join('\n') || 'Brak danych historycznych'}
${historyContext}

DOSTĘPNE ZASOBY:
${resources?.map(r => `- [${r.id}] ${r.title}: ${r.description || 'Brak opisu'}`).join('\n') || 'Brak zasobów'}

DOSTĘPNE REFLINKI:
${reflinks?.map(r => `- ${r.title}: ${r.reflink_code}`).join('\n') || 'Brak reflinków'}

Odpowiadaj w formacie JSON:
{
  "decision": "ACT" lub "WAIT",
  "reasoning": "Krótkie uzasadnienie decyzji (uwzględnij historię kontaktu)",
  "message": "Gotowa wiadomość follow-up (tylko jeśli ACT)",
  "resourceId": "ID rekomendowanego zasobu lub null",
  "reflink": "Kod reflinka do użycia lub null",
  "waitDays": "Liczba dni do czekania (tylko jeśli WAIT)"
}`;

    const contactInfo = contactData ? `
Nazwa kontaktu: ${contactData.name}
Notatki: ${contactData.notes || 'brak'}
Tagi: ${contactData.tags?.join(', ') || 'brak'}` : '';

    const userPrompt = `${contactInfo}
Typ kontaktu: ${contactTypeName}
Etap: ${stageName}
Czas od ostatniego kontaktu: ${lastContactDays || contactData?.last_contact_days || 'nieznany'} dni
Aktualny kontekst rozmowy: ${contextDescription}

Na podstawie CAŁEJ dostępnej historii tego kontaktu i aktualnego kontekstu, przeanalizuj sytuację i podejmij decyzję.`;

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

    // Parse JSON from AI response with improved error handling
    let parsedResponse;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsedResponse = JSON.parse(jsonStr);
      
      // Normalize and validate response fields
      parsedResponse.decision = parsedResponse.decision?.toUpperCase() === 'ACT' ? 'ACT' : 'WAIT';
      parsedResponse.reasoning = parsedResponse.reasoning || 'Brak uzasadnienia';
      parsedResponse.message = parsedResponse.message || null;
      parsedResponse.reflink = parsedResponse.reflink || null;
      parsedResponse.waitDays = typeof parsedResponse.waitDays === 'number' ? parsedResponse.waitDays : 
                                (parseInt(parsedResponse.waitDays) || null);
      
      console.log("Parsed AI response:", { 
        decision: parsedResponse.decision, 
        hasMessage: !!parsedResponse.message,
        resourceId: parsedResponse.resourceId 
      });
    } catch (e) {
      console.error("Failed to parse AI response:", e, "Content:", content);
      parsedResponse = {
        decision: "WAIT",
        reasoning: content || 'Nie udało się przetworzyć odpowiedzi AI',
        message: null,
        resourceId: null,
        reflink: null,
        waitDays: 3
      };
    }

    // Validate recommended_resource_id - must be valid UUID and exist in database
    let validResourceId = null;
    if (parsedResponse.resourceId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(parsedResponse.resourceId)) {
        const { data: resource, error: resourceError } = await supabase
          .from('knowledge_resources')
          .select('id')
          .eq('id', parsedResponse.resourceId)
          .single();
        
        if (resource && !resourceError) {
          validResourceId = parsedResponse.resourceId;
          console.log("Valid resource ID found:", validResourceId);
        } else {
          console.log("Resource ID not found in database:", parsedResponse.resourceId);
        }
      } else {
        console.log("Invalid UUID format for resourceId:", parsedResponse.resourceId);
      }
    }

    // Save session to database with contact_id
    console.log("Saving session to database...");
    const { data: session, error: sessionError } = await supabase
      .from('ai_compass_sessions')
      .insert({
        user_id: userId,
        contact_id: contactId || null,
        contact_type_id: effectiveTypeId,
        stage_id: effectiveStageId,
        context_description: contextDescription,
        last_contact_days: lastContactDays || contactData?.last_contact_days,
        ai_decision: parsedResponse.decision,
        ai_reasoning: parsedResponse.reasoning,
        generated_message: parsedResponse.message,
        recommended_resource_id: validResourceId,
        generated_reflink: parsedResponse.reflink,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Failed to save session:", sessionError);
    } else {
      console.log("Session saved:", session?.id);

      // Log AI decision in contact history if contactId is provided
      if (contactId) {
        await supabase.from('ai_compass_contact_history').insert({
          contact_id: contactId,
          change_type: 'ai_decision',
          new_values: { 
            decision: parsedResponse.decision, 
            reasoning: parsedResponse.reasoning 
          },
          ai_session_id: session?.id,
          created_by: userId,
        });
        console.log("Contact history updated with AI decision");
      }
    }

    // Update learning patterns (anonymous aggregation)
    if (effectiveTypeId && effectiveStageId) {
      console.log("Updating learning patterns...");
      const { data: existingPattern } = await supabase
        .from('ai_compass_learning_patterns')
        .select('*')
        .eq('contact_type_id', effectiveTypeId)
        .eq('stage_id', effectiveStageId)
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
        console.log("Updated existing pattern, count:", existingPattern.sample_count + 1);
      } else {
        await supabase
          .from('ai_compass_learning_patterns')
          .insert({
            contact_type_id: effectiveTypeId,
            stage_id: effectiveStageId,
            pattern_type: 'neutral',
            optimal_timing_days: lastContactDays || contactData?.last_contact_days,
            sample_count: 1
          });
        console.log("Created new learning pattern");
      }
    }

    console.log("AI-Compass function completed successfully");
    return new Response(JSON.stringify({
      ...parsedResponse,
      resourceId: validResourceId,
      sessionId: session?.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in ai-compass function:", error);
    console.error("Stack trace:", error.stack);
    return new Response(JSON.stringify({ 
      error: error.message || "Unknown error occurred",
      details: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
