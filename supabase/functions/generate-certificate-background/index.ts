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

      // Analyze image for optimal text placements using stronger model
      const analysisPrompt = `TASK: Analyze this certificate background image (${width}x${height} pixels) and find the EXACT boundaries of the clear/content zone.

STEP 1 - SCAN FOR DECORATIVE ELEMENTS:
Carefully scan the ENTIRE image and identify ALL:
- Borders and frames (ornate, geometric, simple lines)
- Patterns and textures (floral, geometric, abstract)
- Ornaments and decorations (corners, header/footer graphics)
- Logos, seals, or watermarks
- Color gradients that might reduce text contrast

STEP 2 - MAP DECORATIVE ELEMENT BOUNDARIES:
For each decorative element found, note its approximate bounding box:
- left_edge, right_edge, top_edge, bottom_edge in pixels

STEP 3 - CALCULATE THE LARGEST CLEAR ZONE:
Find the largest rectangular area that:
- Has NO decorative elements overlapping
- Has uniform or near-uniform background for good text contrast
- Calculate: left, right, top, bottom boundaries
- Calculate CENTER: centerX = (left + right) / 2, centerY = (top + bottom) / 2

STEP 4 - POSITION TEXT ELEMENTS:
Place ALL text elements horizontally centered at clearZone.centerX (NOT at ${Math.round(width / 2)} unless that matches the clear zone center).

Return ONLY valid JSON:
{
  "clearZone": {
    "left": <pixel value>,
    "right": <pixel value>,
    "top": <pixel value>,
    "bottom": <pixel value>,
    "centerX": <calculated horizontal center of clear zone>,
    "centerY": <calculated vertical center of clear zone>
  },
  "decorativeElements": [
    {"type": "border/pattern/ornament", "location": "top/bottom/left/right/corner", "boundingBox": {"left": ?, "right": ?, "top": ?, "bottom": ?}}
  ],
  "suggestedPlacements": [
    {"placeholder": "title", "label": "${labels.title}", "x": <clearZone.centerX>, "y": <within top third of clearZone>, "fontSize": ${Math.round(36 * (width / 842))}, "fontWeight": "bold", "color": "#1a1a2e", "align": "center"},
    {"placeholder": "{userName}", "label": "${labels.userName}", "x": <clearZone.centerX>, "y": <slightly above center of clearZone>, "fontSize": ${Math.round(28 * (width / 842))}, "fontWeight": "bold", "color": "#1a1a2e", "align": "center"},
    {"placeholder": "{moduleTitle}", "label": "${labels.moduleTitle}", "x": <clearZone.centerX>, "y": <slightly below center of clearZone>, "fontSize": ${Math.round(20 * (width / 842))}, "fontWeight": "normal", "color": "#333333", "align": "center"},
    {"placeholder": "{completionDate}", "label": "${labels.completionDate}", "x": <clearZone.centerX>, "y": <within bottom third of clearZone>, "fontSize": ${Math.round(14 * (width / 842))}, "fontWeight": "normal", "color": "#666666", "align": "center"}
  ]
}

CRITICAL: The "x" value for ALL placements MUST be clearZone.centerX, NOT the canvas center (${Math.round(width / 2)}) unless they happen to be the same.`;

      console.log('Analyzing image for placements with gemini-2.5-pro');

      const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
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

      let clearZone = null;

      if (analysisResponse.ok) {
        try {
          const analysisData = await analysisResponse.json();
          const content = analysisData.choices?.[0]?.message?.content;
          
          console.log('AI analysis raw response:', content?.substring(0, 500));
          
          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              
              // Extract clear zone info
              if (parsed.clearZone) {
                clearZone = parsed.clearZone;
                console.log('Detected clear zone:', clearZone);
              }
              
              // Log detected decorative elements
              if (parsed.decorativeElements) {
                console.log('Detected decorative elements:', JSON.stringify(parsed.decorativeElements));
              }
              
              if (parsed.suggestedPlacements && Array.isArray(parsed.suggestedPlacements)) {
                // Validate and adjust placements based on clear zone
                suggestedPlacements = parsed.suggestedPlacements.map((placement: any) => {
                  let adjustedX = placement.x;
                  
                  // If we have a clear zone, use its center
                  if (clearZone?.centerX) {
                    adjustedX = clearZone.centerX;
                  }
                  
                  // Validate X is not too close to edges (within 10-90% of width)
                  const minX = width * 0.10;
                  const maxX = width * 0.90;
                  if (adjustedX < minX || adjustedX > maxX) {
                    console.log(`Correcting X from ${adjustedX} to center ${width / 2}`);
                    adjustedX = Math.round(width / 2);
                  }
                  
                  // Validate Y is within reasonable bounds
                  let adjustedY = placement.y;
                  const minY = height * 0.05;
                  const maxY = height * 0.95;
                  if (adjustedY < minY) adjustedY = minY;
                  if (adjustedY > maxY) adjustedY = maxY;
                  
                  return {
                    ...placement,
                    x: Math.round(adjustedX),
                    y: Math.round(adjustedY)
                  };
                });
                
                console.log('Final adjusted placements:', JSON.stringify(suggestedPlacements));
              }
            }
          }
        } catch (parseError) {
          console.log('Using default placements, parse error:', parseError);
        }
      } else {
        console.log('Analysis response not OK, status:', analysisResponse.status);
      }

      return new Response(JSON.stringify({
        success: true,
        imageUrl: generatedImageUrl,
        suggestedPlacements,
        clearZone,
        format: { width, height },
        language: lang
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'analyze-and-arrange') {
      if (!imageUrl) {
        throw new Error('Image URL is required for analysis');
      }

      const analysisPrompt = `TASK: Analyze this certificate background image (${width}x${height} pixels) and find the EXACT boundaries of the clear/content zone.

STEP 1 - SCAN FOR DECORATIVE ELEMENTS:
Carefully scan the ENTIRE image and identify ALL:
- Borders and frames (ornate, geometric, simple lines)
- Patterns and textures (floral, geometric, abstract)
- Ornaments and decorations (corners, header/footer graphics)
- Logos, seals, or watermarks
- Colored areas that might reduce text contrast

STEP 2 - CALCULATE THE LARGEST CLEAR ZONE:
Find the largest rectangular area that:
- Has NO decorative elements overlapping
- Has uniform or near-uniform background for good text contrast
- Calculate: left, right, top, bottom boundaries in pixels
- Calculate CENTER: centerX = (left + right) / 2

STEP 3 - POSITION TEXT ELEMENTS:
All text elements MUST be horizontally centered at clearZone.centerX.

Return ONLY valid JSON:
{
  "clearZone": {
    "left": <pixel>,
    "right": <pixel>,
    "top": <pixel>,
    "bottom": <pixel>,
    "centerX": <calculated center>,
    "centerY": <calculated center>
  },
  "suggestedPlacements": [
    {"placeholder": "title", "label": "${labels.title}", "x": <clearZone.centerX>, "y": <top third>, "fontSize": ${Math.round(36 * (width / 842))}, "fontWeight": "bold", "color": "#1a1a2e", "align": "center"},
    {"placeholder": "{userName}", "label": "${labels.userName}", "x": <clearZone.centerX>, "y": <upper middle>, "fontSize": ${Math.round(28 * (width / 842))}, "fontWeight": "bold", "color": "#1a1a2e", "align": "center"},
    {"placeholder": "{moduleTitle}", "label": "${labels.moduleTitle}", "x": <clearZone.centerX>, "y": <lower middle>, "fontSize": ${Math.round(20 * (width / 842))}, "fontWeight": "normal", "color": "#333333", "align": "center"},
    {"placeholder": "{completionDate}", "label": "${labels.completionDate}", "x": <clearZone.centerX>, "y": <bottom third>, "fontSize": ${Math.round(14 * (width / 842))}, "fontWeight": "normal", "color": "#666666", "align": "center"}
  ]
}

CRITICAL: x values MUST equal clearZone.centerX, NOT ${Math.round(width / 2)} unless the clear zone is centered.`;

      console.log('Analyzing existing image with gemini-2.5-pro');

      const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
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
        console.log('Analysis failed, using defaults');
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
        
        console.log('Analyze-and-arrange raw response:', content?.substring(0, 500));
        
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            
            let clearZone = parsed.clearZone;
            console.log('Detected clear zone:', clearZone);
            
            if (parsed.suggestedPlacements && Array.isArray(parsed.suggestedPlacements)) {
              // Validate and adjust placements
              const adjustedPlacements = parsed.suggestedPlacements.map((placement: any) => {
                let adjustedX = placement.x;
                
                // Use clear zone center if available
                if (clearZone?.centerX) {
                  adjustedX = clearZone.centerX;
                }
                
                // Validate X bounds
                const minX = width * 0.10;
                const maxX = width * 0.90;
                if (adjustedX < minX || adjustedX > maxX) {
                  console.log(`Correcting X from ${adjustedX} to center`);
                  adjustedX = Math.round(width / 2);
                }
                
                // Validate Y bounds
                let adjustedY = placement.y;
                if (adjustedY < height * 0.05) adjustedY = height * 0.05;
                if (adjustedY > height * 0.95) adjustedY = height * 0.95;
                
                return {
                  ...placement,
                  x: Math.round(adjustedX),
                  y: Math.round(adjustedY)
                };
              });
              
              console.log('Final adjusted placements:', JSON.stringify(adjustedPlacements));
              
              return new Response(JSON.stringify({
                success: true,
                suggestedPlacements: adjustedPlacements,
                clearZone
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          }
        }
      } catch (e) {
        console.log('Parse error, using defaults:', e);
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
