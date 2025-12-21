import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to filter specialist data based on visibility settings and user role
function filterSpecialistData(
  specialist: any, 
  settings: any, 
  userRole: string | null
): any {
  const filtered: any = {
    user_id: specialist.user_id,
    first_name: specialist.first_name,
    last_name: specialist.last_name,
    city: specialist.city,
    country: specialist.country,
    specialization: specialist.specialization,
    profile_description: specialist.profile_description,
    search_keywords: specialist.search_keywords,
  };

  // Determine what data to show based on role and settings
  const showEmail = userRole === 'admin' || 
    (userRole === 'client' && settings.show_email_to_clients) ||
    (userRole === 'partner' && settings.show_email_to_partners) ||
    (userRole === 'specjalista' && settings.show_email_to_specjalista);
    
  const showPhone = userRole === 'admin' ||
    (userRole === 'client' && settings.show_phone_to_clients) ||
    (userRole === 'partner' && settings.show_phone_to_partners) ||
    (userRole === 'specjalista' && settings.show_phone_to_specjalista);
    
  const showAddress = userRole === 'admin' ||
    (userRole === 'client' && settings.show_address_to_clients) ||
    (userRole === 'partner' && settings.show_address_to_partners) ||
    (userRole === 'specjalista' && settings.show_address_to_specjalista);

  // Only include data if allowed for this role
  filtered.email = showEmail ? specialist.email : null;
  filtered.phone_number = showPhone ? specialist.phone_number : null;
  filtered.street_address = showAddress ? specialist.street_address : null;
  filtered.postal_code = showAddress ? specialist.postal_code : null;
  
  // Include messaging availability info
  const canMessage = settings.allow_messaging && (
    userRole === 'admin' ||
    (userRole === 'client' && settings.messaging_enabled_for_clients) ||
    (userRole === 'partner' && settings.messaging_enabled_for_partners) ||
    (userRole === 'specjalista' && settings.messaging_enabled_for_specjalista)
  );
  filtered.can_message = canMessage;

  return filtered;
}

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

    // Get the user's role from the Authorization header
    let userRole: string | null = null;
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      
      const { data: { user } } = await userClient.auth.getUser(token);
      
      if (user) {
        // Get user role from user_roles table
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        userRole = roleData?.role || 'client';
        console.log("User role:", userRole);
      }
    }

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

    // Check if user's role has access to search
    const hasAccess = userRole === 'admin' ||
      (!userRole && settings.visible_to_anonymous) ||
      (userRole === 'client' && settings.visible_to_clients) ||
      (userRole === 'partner' && settings.visible_to_partners) ||
      (userRole === 'specjalista' && settings.visible_to_specjalista);

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ specialists: [], message: "Access denied for your role" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all searchable specialists with full data (we'll filter later)
    const { data: specialists, error: specialistsError } = await supabase
      .from("profiles")
      .select(`
        user_id,
        first_name,
        last_name,
        email,
        phone_number,
        street_address,
        postal_code,
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
      
      // Apply visibility settings to each specialist
      const visibleSpecialists = filtered
        .slice(0, settings.max_results || 20)
        .map(s => filterSpecialistData(s, settings, userRole));
      
      return new Response(
        JSON.stringify({ 
          specialists: visibleSpecialists,
          fallback: true,
          settings: { allow_messaging: settings.allow_messaging }
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
      
      // Apply visibility settings
      const visibleSpecialists = filtered
        .slice(0, settings.max_results || 20)
        .map(s => filterSpecialistData(s, settings, userRole));
      
      return new Response(
        JSON.stringify({ 
          specialists: visibleSpecialists,
          fallback: true,
          settings: { allow_messaging: settings.allow_messaging }
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

    // Map indices to specialists and apply visibility settings
    const matchedSpecialists = matchedIndices
      .slice(0, settings.max_results || 20)
      .map(idx => filteredSpecialists[idx])
      .filter(Boolean)
      .map(s => filterSpecialistData(s, settings, userRole));

    console.log("Matched specialists:", matchedSpecialists.length);

    return new Response(
      JSON.stringify({ 
        specialists: matchedSpecialists,
        settings: { allow_messaging: settings.allow_messaging }
      }),
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
