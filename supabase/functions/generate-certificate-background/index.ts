import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CERTIFICATE_LABELS: Record<string, {
  title: string;
  userName: string;
  moduleTitle: string;
  completionDate: string;
  promptSuffix: string;
}> = {
  pl: {
    title: 'Certyfikat Ukończenia',
    userName: 'Imię i Nazwisko',
    moduleTitle: 'Tytuł Szkolenia',
    completionDate: 'Data ukończenia',
    promptSuffix: 'Certificate text will be in Polish.'
  },
  en: {
    title: 'Certificate of Completion',
    userName: 'Full Name',
    moduleTitle: 'Training Title',
    completionDate: 'Completion Date',
    promptSuffix: 'Certificate text will be in English.'
  },
  de: {
    title: 'Abschlusszertifikat',
    userName: 'Vollständiger Name',
    moduleTitle: 'Schulungstitel',
    completionDate: 'Abschlussdatum',
    promptSuffix: 'Certificate text will be in German.'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, action, format, language, imageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get dimensions from format or use defaults
    const width = format?.width || 842;
    const height = format?.height || 595;
    const orientation = width > height ? 'landscape' : 'portrait';
    const lang = language || 'pl';
    const labels = CERTIFICATE_LABELS[lang] || CERTIFICATE_LABELS.pl;

    console.log('Processing request:', { action, prompt, format: { width, height }, language: lang });

    if (action === 'generate-background') {
      // Enhanced prompt for better placeholder positioning
      const imagePrompt = `Create a professional certificate background image in ${width}x${height} pixels (${orientation}).
Style: ${prompt}

CRITICAL DESIGN REQUIREMENTS:
1. MUST leave a completely CLEAR, UNOBSTRUCTED rectangular zone in the CENTER of the image:
   - This zone should span from approximately 15% to 85% width (${Math.round(width * 0.15)}px to ${Math.round(width * 0.85)}px)
   - And from approximately 15% to 85% height (${Math.round(height * 0.15)}px to ${Math.round(height * 0.85)}px)
   - NO decorative elements, patterns, or graphics in this central zone
   
2. All decorative elements (borders, frames, patterns, ornaments) should be ONLY at:
   - The outer edges and corners (within 15% of edges)
   - A thin decorative header strip at the very top (0-12% height)
   - A thin footer strip at the very bottom (88-100% height)

3. The central content area must have:
   - Solid, uniform background color or very subtle gradient
   - High contrast for dark text readability
   - NO watermarks, textures, or patterns that would interfere with text

4. DO NOT include any text, placeholder text, or labels - only decorative background elements.

${labels.promptSuffix}`;

      console.log('Generating background with prompt:', imagePrompt);

      const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            { role: 'user', content: imagePrompt }
          ],
          modalities: ['image', 'text']
        }),
      });

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error('Image generation error:', imageResponse.status, errorText);
        throw new Error(`Image generation failed: ${imageResponse.status}`);
      }

      const imageData = await imageResponse.json();
      console.log('Image response received');

      const generatedImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (!generatedImageUrl) {
        throw new Error('No image generated');
      }

      // Analyze image for optimal text placements
      const analysisPrompt = `Analyze this certificate background image (${width}x${height} pixels, ${orientation}).

TASK: Find optimal positions for certificate text that AVOID all decorative/graphic elements.

ANALYSIS STEPS:
1. Identify ALL decorative elements (borders, patterns, ornaments, logos, graphics)
2. Map out the CLEAR ZONES where no decorative elements exist
3. Place text elements ONLY in clear zones with good contrast

PLACEMENT RULES:
- title: Should be in the upper-middle clear area, BELOW any top decorative border (approximately y = ${Math.round(height * 0.12)} to ${Math.round(height * 0.18)})
- {userName}: Centered vertically, in the largest clear zone (approximately y = ${Math.round(height * 0.35)} to ${Math.round(height * 0.45)})
- {moduleTitle}: Below user name, in the clear zone (approximately y = ${Math.round(height * 0.50)} to ${Math.round(height * 0.58)})
- {completionDate}: Lower area, ABOVE any bottom decorative elements (approximately y = ${Math.round(height * 0.78)} to ${Math.round(height * 0.85)})

Return ONLY valid JSON with coordinates that AVOID ALL graphic elements:
{
  "suggestedPlacements": [
    {"placeholder": "title", "label": "${labels.title}", "x": ${Math.round(width / 2)}, "y": ${Math.round(height * 0.15)}, "fontSize": ${Math.round(36 * (width / 842))}, "fontWeight": "bold", "color": "#1a1a2e", "align": "center"},
    {"placeholder": "{userName}", "label": "${labels.userName}", "x": ${Math.round(width / 2)}, "y": ${Math.round(height * 0.40)}, "fontSize": ${Math.round(28 * (width / 842))}, "fontWeight": "bold", "color": "#1a1a2e", "align": "center"},
    {"placeholder": "{moduleTitle}", "label": "${labels.moduleTitle}", "x": ${Math.round(width / 2)}, "y": ${Math.round(height * 0.54)}, "fontSize": ${Math.round(20 * (width / 842))}, "fontWeight": "normal", "color": "#333333", "align": "center"},
    {"placeholder": "{completionDate}", "label": "${labels.completionDate}", "x": ${Math.round(width / 2)}, "y": ${Math.round(height * 0.82)}, "fontSize": ${Math.round(14 * (width / 842))}, "fontWeight": "normal", "color": "#666666", "align": "center"}
  ],
  "safeZones": [
    {"x": ${Math.round(width * 0.15)}, "y": ${Math.round(height * 0.12)}, "width": ${Math.round(width * 0.70)}, "height": ${Math.round(height * 0.76)}, "description": "main content area"}
  ],
  "avoidedElements": ["description of decorative elements detected"]
}

IMPORTANT: Adjust Y positions based on ACTUAL clear zones in the image. Do not use default positions if they overlap decorations.`;

      console.log('Analyzing image for placements');

      const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: analysisPrompt },
                { type: 'image_url', image_url: { url: generatedImageUrl } }
              ]
            }
          ]
        }),
      });

      // Default placements scaled to format
      let suggestedPlacements = [
        { placeholder: "title", label: labels.title, x: Math.round(width / 2), y: Math.round(height * 0.15), fontSize: Math.round(36 * (width / 842)), fontWeight: "bold", color: "#1a1a2e", align: "center" },
        { placeholder: "{userName}", label: labels.userName, x: Math.round(width / 2), y: Math.round(height * 0.40), fontSize: Math.round(28 * (width / 842)), fontWeight: "bold", color: "#1a1a2e", align: "center" },
        { placeholder: "{moduleTitle}", label: labels.moduleTitle, x: Math.round(width / 2), y: Math.round(height * 0.54), fontSize: Math.round(20 * (width / 842)), fontWeight: "normal", color: "#333333", align: "center" },
        { placeholder: "{completionDate}", label: labels.completionDate, x: Math.round(width / 2), y: Math.round(height * 0.82), fontSize: Math.round(14 * (width / 842)), fontWeight: "normal", color: "#666666", align: "center" }
      ];

      if (analysisResponse.ok) {
        try {
          const analysisData = await analysisResponse.json();
          const content = analysisData.choices?.[0]?.message?.content;
          
          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.suggestedPlacements && Array.isArray(parsed.suggestedPlacements)) {
                suggestedPlacements = parsed.suggestedPlacements;
                console.log('Using AI-suggested placements');
              }
            }
          }
        } catch (parseError) {
          console.log('Using default placements, parse error:', parseError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        imageUrl: generatedImageUrl,
        suggestedPlacements,
        format: { width, height },
        language: lang
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'analyze-and-arrange') {
      if (!imageUrl) {
        throw new Error('Image URL is required for analysis');
      }

      const analysisPrompt = `Analyze this certificate background image (${width}x${height} pixels).

TASK: Find optimal positions for certificate text that AVOID all decorative/graphic elements.

ANALYSIS STEPS:
1. Identify ALL decorative elements (borders, patterns, ornaments, logos, graphics)
2. Map out the CLEAR ZONES where no decorative elements exist
3. Place text elements ONLY in clear zones with good contrast

Return ONLY valid JSON:
{
  "suggestedPlacements": [
    {"placeholder": "title", "label": "${labels.title}", "x": ${Math.round(width / 2)}, "y": ??, "fontSize": ${Math.round(36 * (width / 842))}, "fontWeight": "bold", "color": "#1a1a2e", "align": "center"},
    {"placeholder": "{userName}", "label": "${labels.userName}", "x": ${Math.round(width / 2)}, "y": ??, "fontSize": ${Math.round(28 * (width / 842))}, "fontWeight": "bold", "color": "#1a1a2e", "align": "center"},
    {"placeholder": "{moduleTitle}", "label": "${labels.moduleTitle}", "x": ${Math.round(width / 2)}, "y": ??, "fontSize": ${Math.round(20 * (width / 842))}, "fontWeight": "normal", "color": "#333333", "align": "center"},
    {"placeholder": "{completionDate}", "label": "${labels.completionDate}", "x": ${Math.round(width / 2)}, "y": ??, "fontSize": ${Math.round(14 * (width / 842))}, "fontWeight": "normal", "color": "#666666", "align": "center"}
  ]
}

Replace ?? with actual Y positions based on clear zones in the image.`;

      const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: analysisPrompt },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ]
        }),
      });

      const defaultPlacements = [
        { placeholder: "title", label: labels.title, x: Math.round(width / 2), y: Math.round(height * 0.15), fontSize: Math.round(36 * (width / 842)), fontWeight: "bold", color: "#1a1a2e", align: "center" },
        { placeholder: "{userName}", label: labels.userName, x: Math.round(width / 2), y: Math.round(height * 0.40), fontSize: Math.round(28 * (width / 842)), fontWeight: "bold", color: "#1a1a2e", align: "center" },
        { placeholder: "{moduleTitle}", label: labels.moduleTitle, x: Math.round(width / 2), y: Math.round(height * 0.54), fontSize: Math.round(20 * (width / 842)), fontWeight: "normal", color: "#333333", align: "center" },
        { placeholder: "{completionDate}", label: labels.completionDate, x: Math.round(width / 2), y: Math.round(height * 0.82), fontSize: Math.round(14 * (width / 842)), fontWeight: "normal", color: "#666666", align: "center" }
      ];

      if (!analysisResponse.ok) {
        return new Response(JSON.stringify({
          success: true,
          suggestedPlacements: defaultPlacements
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      try {
        const analysisData = await analysisResponse.json();
        const content = analysisData.choices?.[0]?.message?.content;
        
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.suggestedPlacements) {
              return new Response(JSON.stringify({
                success: true,
                suggestedPlacements: parsed.suggestedPlacements
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          }
        }
      } catch (e) {
        console.log('Parse error, using defaults');
      }

      return new Response(JSON.stringify({
        success: true,
        suggestedPlacements: defaultPlacements
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      throw new Error('Invalid action. Use "generate-background" or "analyze-and-arrange"');
    }

  } catch (error) {
    console.error('Error in generate-certificate-background:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
