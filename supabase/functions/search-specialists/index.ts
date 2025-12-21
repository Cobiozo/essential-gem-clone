import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    console.log("Search query received:", query);
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ specialists: [], message: "Query too short" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if search is enabled
    const { data: settings } = await supabase
      .from("specialist_search_settings")
      .select("*")
      .limit(1)
      .single();

    console.log("Search settings:", settings);

    if (!settings?.is_enabled) {
      return new Response(
        JSON.stringify({ specialists: [], message: "Search is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all searchable specialists - JOIN with user_roles to filter by role
    const { data: specialists, error: specialistsError } = await supabase
      .from("profiles")
      .select(`
        user_id,
        first_name,
        last_name,
        email,
        city,
        country,
        specialization,
        profile_description,
        search_keywords
      `)
      .eq("is_searchable", true)
      .eq("is_active", true);

    if (specialistsError) {
      console.error("Error fetching profiles:", specialistsError);
      throw specialistsError;
    }

    // Filter to only include specialists by checking user_roles
    const { data: specialistRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "specjalista");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
      throw rolesError;
    }

    const specialistUserIds = new Set(specialistRoles?.map(r => r.user_id) || []);
    const filteredSpecialists = specialists?.filter(s => specialistUserIds.has(s.user_id)) || [];

    console.log("Found specialists:", filteredSpecialists.length);

    if (filteredSpecialists.length === 0) {
      return new Response(
        JSON.stringify({ specialists: [], message: "No specialists found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we have Lovable API key for AI semantic matching
    if (!LOVABLE_API_KEY) {
      console.log("No LOVABLE_API_KEY, using basic text search");
      // Fallback to basic text search
      const queryLower = query.toLowerCase();
      const filtered = filteredSpecialists.filter(s => {
        const searchText = [
          s.first_name,
          s.last_name,
          s.specialization,
          s.profile_description,
          s.city,
          ...(s.search_keywords || [])
        ].filter(Boolean).join(" ").toLowerCase();
        return searchText.includes(queryLower);
      });
      
      return new Response(
        JSON.stringify({ 
          specialists: filtered.slice(0, settings.max_results || 20),
          fallback: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context for AI semantic matching
    const specialistContext = filteredSpecialists.map((s, idx) => {
      const parts = [
        `[${idx}] ${s.first_name || ""} ${s.last_name || ""}`.trim(),
        s.specialization ? `Specjalizacja: ${s.specialization}` : "",
        s.profile_description ? `Opis: ${s.profile_description}` : "",
        s.search_keywords?.length ? `Słowa kluczowe: ${s.search_keywords.join(", ")}` : "",
        s.city ? `Lokalizacja: ${s.city}${s.country ? `, ${s.country}` : ""}` : "",
      ].filter(Boolean);
      return parts.join(". ");
    }).join("\n\n");

    console.log("Calling AI Gateway for semantic matching...");

    // Use AI for semantic matching
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Jesteś systemem dopasowywania semantycznego dla wyszukiwarki specjalistów. Twoje zadanie to przeanalizować listę specjalistów i znaleźć tych, którzy najlepiej pasują do zapytania użytkownika.

Rozważ:
- Dokładne dopasowania słów
- Synonimy i słowa bliskoznaczne (np. "dietetyk" = "specjalista ds. żywienia", "coach" = "trener")
- Kontekst i znaczenie zapytania
- Lokalizację jeśli podana w zapytaniu
- Powiązane specjalizacje (np. "autyzm" może pasować do "spektrum autyzmu", "asperger", "tyflopedagog")
- Podobne słowa i dziedziny

WAŻNE: Odpowiedz TYLKO tablicą JSON z indeksami pasujących specjalistów w kolejności od najlepszego dopasowania.
Format: [0, 5, 2] - gdzie liczby to indeksy specjalistów z listy.
Jeśli nikt nie pasuje, zwróć pustą tablicę: []
Maksymalnie 10 wyników.`
          },
          {
            role: "user",
            content: `Zapytanie użytkownika: "${query}"

Lista specjalistów:
${specialistContext}

Zwróć tablicę indeksów pasujących specjalistów.`
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI Gateway error:", aiResponse.status, await aiResponse.text());
      // Fallback to basic text search
      const queryLower = query.toLowerCase();
      const filtered = filteredSpecialists.filter(s => {
        const searchText = [
          s.first_name,
          s.last_name,
          s.specialization,
          s.profile_description,
          s.city,
          ...(s.search_keywords || [])
        ].filter(Boolean).join(" ").toLowerCase();
        return searchText.includes(queryLower);
      });
      
      return new Response(
        JSON.stringify({ 
          specialists: filtered.slice(0, settings.max_results || 20),
          fallback: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "[]";
    
    console.log("AI response:", aiContent);

    // Parse AI response
    let matchedIndices: number[] = [];
    try {
      const parsed = JSON.parse(aiContent.replace(/```json?|```/g, "").trim());
      if (Array.isArray(parsed)) {
        matchedIndices = parsed.filter(i => typeof i === "number" && i >= 0 && i < filteredSpecialists.length);
      }
    } catch (e) {
      console.error("Error parsing AI response:", e, aiContent);
      // Extract numbers from response as fallback
      const numbers = aiContent.match(/\d+/g);
      if (numbers) {
        matchedIndices = numbers
          .map(Number)
          .filter(i => i >= 0 && i < filteredSpecialists.length);
      }
    }

    // Map indices to specialists
    const matchedSpecialists = matchedIndices
      .slice(0, settings.max_results || 20)
      .map(idx => filteredSpecialists[idx])
      .filter(Boolean);

    console.log("Matched specialists:", matchedSpecialists.length);

    return new Response(
      JSON.stringify({ specialists: matchedSpecialists }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in search-specialists:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
