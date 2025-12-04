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
    const { prompt, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing request:', { action, prompt });

    if (action === 'generate-background') {
      // Generate certificate background image using AI
      const imagePrompt = `Create a professional certificate background image in A4 landscape format (842x595 pixels). Style: ${prompt}. The design should have:
- Elegant decorative borders or frames
- Subtle background patterns or gradients
- Large clear central area for text content
- Professional and formal appearance suitable for certificates
- High contrast between background and where text will be placed
Do NOT include any text, placeholder text, or labels - only decorative background elements.`;

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

      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (!imageUrl) {
        throw new Error('No image generated');
      }

      // Now analyze the image to suggest text placements
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
                {
                  type: 'text',
                  text: `Analyze this certificate background image (842x595 pixels, A4 landscape). 
Identify the best positions for placing certificate text elements.
Consider the background design, contrast areas, and visual hierarchy.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "suggestedPlacements": [
    {"placeholder": "title", "label": "Certyfikat Ukończenia", "x": 421, "y": 60, "fontSize": 36, "fontWeight": "bold", "color": "#1a1a2e", "align": "center"},
    {"placeholder": "{userName}", "label": "Imię i Nazwisko", "x": 421, "y": 200, "fontSize": 28, "fontWeight": "bold", "color": "#1a1a2e", "align": "center"},
    {"placeholder": "{moduleTitle}", "label": "Tytuł Szkolenia", "x": 421, "y": 280, "fontSize": 20, "fontWeight": "normal", "color": "#333333", "align": "center"},
    {"placeholder": "{completionDate}", "label": "Data ukończenia", "x": 421, "y": 520, "fontSize": 14, "fontWeight": "normal", "color": "#666666", "align": "center"}
  ],
  "backgroundAnalysis": {
    "primaryColor": "#hex",
    "contrastAreas": "description of light/dark areas",
    "recommendedTextColor": "#hex"
  }
}

Adjust x, y positions (0-842 for x, 0-595 for y) and colors based on the actual background design for optimal readability.`
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl }
                }
              ]
            }
          ]
        }),
      });

      let suggestedPlacements = [
        { placeholder: "title", label: "Certyfikat Ukończenia", x: 421, y: 60, fontSize: 36, fontWeight: "bold", color: "#1a1a2e", align: "center" },
        { placeholder: "{userName}", label: "Imię i Nazwisko", x: 421, y: 200, fontSize: 28, fontWeight: "bold", color: "#1a1a2e", align: "center" },
        { placeholder: "{moduleTitle}", label: "Tytuł Szkolenia", x: 421, y: 280, fontSize: 20, fontWeight: "normal", color: "#333333", align: "center" },
        { placeholder: "{completionDate}", label: "Data ukończenia", x: 421, y: 520, fontSize: 14, fontWeight: "normal", color: "#666666", align: "center" }
      ];

      if (analysisResponse.ok) {
        try {
          const analysisData = await analysisResponse.json();
          const content = analysisData.choices?.[0]?.message?.content;
          
          if (content) {
            // Try to parse JSON from the response
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
        imageUrl,
        suggestedPlacements
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'analyze-and-arrange') {
      // Analyze existing background and suggest placements
      const { imageUrl } = await req.json();
      
      if (!imageUrl) {
        throw new Error('Image URL is required for analysis');
      }

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
                {
                  type: 'text',
                  text: `Analyze this certificate background image (842x595 pixels).
Find the best positions for text elements considering contrast and visual hierarchy.

Return ONLY valid JSON:
{
  "suggestedPlacements": [
    {"placeholder": "title", "label": "Certyfikat Ukończenia", "x": 421, "y": 60, "fontSize": 36, "fontWeight": "bold", "color": "#1a1a2e", "align": "center"},
    {"placeholder": "{userName}", "x": 421, "y": 200, "fontSize": 28, "fontWeight": "bold", "color": "#1a1a2e", "align": "center"},
    {"placeholder": "{moduleTitle}", "x": 421, "y": 280, "fontSize": 20, "fontWeight": "normal", "color": "#333333", "align": "center"},
    {"placeholder": "{completionDate}", "x": 421, "y": 520, "fontSize": 14, "fontWeight": "normal", "color": "#666666", "align": "center"}
  ]
}`
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl }
                }
              ]
            }
          ]
        }),
      });

      const defaultPlacements = [
        { placeholder: "title", label: "Certyfikat Ukończenia", x: 421, y: 60, fontSize: 36, fontWeight: "bold", color: "#1a1a2e", align: "center" },
        { placeholder: "{userName}", x: 421, y: 200, fontSize: 28, fontWeight: "bold", color: "#1a1a2e", align: "center" },
        { placeholder: "{moduleTitle}", x: 421, y: 280, fontSize: 20, fontWeight: "normal", color: "#333333", align: "center" },
        { placeholder: "{completionDate}", x: 421, y: 520, fontSize: 14, fontWeight: "normal", color: "#666666", align: "center" }
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
