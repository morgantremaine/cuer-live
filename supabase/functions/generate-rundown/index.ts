import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid prompt' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Generating rundown from prompt:', prompt.substring(0, 100));

    const systemPrompt = `You are Cuer, a broadcast production assistant AI. Generate realistic, professional rundown structures for live productions.

Guidelines:
- Create headers to organize segments (use type: "header")
- Include realistic durations in MM:SS format (e.g., "02:00", "05:30")
- Populate talent names from the user's description
- Write professional broadcast scripts with [TALENT {color}] formatting for on-air talent
- Include realistic GFX, video, and notes when relevant
- Use segment names that match broadcast terminology
- Ensure logical flow and pacing
- Total runtime should be reasonable for the show type described
- Use rowNumber starting from "1" for regular items, leave empty for headers

Return a structured array of rundown items with these fields:
- id: generate unique IDs using timestamp pattern like "item_${Date.now()}_${randomString}"
- type: "regular" or "header"
- rowNumber: sequential numbers "1", "2", "3" for regular items, empty string for headers
- name: segment/section name
- duration: in MM:SS format (or empty string for headers)
- startTime: empty string (will be calculated)
- endTime: empty string (will be calculated)
- elapsedTime: empty string (will be calculated)
- talent: cast member names or empty string
- script: actual broadcast script content or empty string
- gfx: graphics descriptions or empty string
- video: video/replay descriptions or empty string
- images: empty string
- notes: production notes or empty string
- color: empty string
- isFloating: false
- customFields: empty object {}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_rundown",
            description: "Generate a broadcast rundown with structured items",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  description: "Array of rundown items including headers and regular segments",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", description: "Unique identifier for the item" },
                      type: { type: "string", enum: ["regular", "header"], description: "Type of rundown item" },
                      rowNumber: { type: "string", description: "Row number for regular items, empty for headers" },
                      name: { type: "string", description: "Name of the segment or header" },
                      duration: { type: "string", description: "Duration in MM:SS format, empty for headers" },
                      startTime: { type: "string", description: "Leave empty, will be calculated" },
                      endTime: { type: "string", description: "Leave empty, will be calculated" },
                      elapsedTime: { type: "string", description: "Leave empty, will be calculated" },
                      talent: { type: "string", description: "Talent/cast members for this segment" },
                      script: { type: "string", description: "Broadcast script content" },
                      gfx: { type: "string", description: "Graphics descriptions" },
                      video: { type: "string", description: "Video/replay descriptions" },
                      images: { type: "string", description: "Leave empty" },
                      notes: { type: "string", description: "Production notes" },
                      color: { type: "string", description: "Leave empty" },
                      isFloating: { type: "boolean", description: "Always false" },
                      customFields: { type: "object", description: "Additional custom fields as needed" }
                    },
                    required: ["id", "type", "rowNumber", "name", "duration", "startTime", "endTime", "elapsedTime", "talent", "script", "gfx", "video", "images", "notes", "color", "isFloating"]
                  }
                }
              },
              required: ["items"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_rundown" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), 
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate rundown' }), 
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('OpenAI response received');

    // Extract the function call result
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'generate_rundown') {
      console.error('Invalid tool call response:', data);
      return new Response(
        JSON.stringify({ error: 'Invalid response from AI' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const generatedData = JSON.parse(toolCall.function.arguments);
    const items = generatedData.items || [];

    console.log(`Successfully generated ${items.length} rundown items`);

    return new Response(
      JSON.stringify({ items }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-rundown function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
