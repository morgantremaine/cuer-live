import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const { prompt, startTime } = await req.json();

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
    console.log('Start time:', startTime);

    const systemPrompt = `You are Cuer, a broadcast production assistant AI that generates rundown TEMPLATES/BLUEPRINTS - structured outlines that producers will expand into full rundowns.

YOUR ROLE: Generate a well-organized starting point with 15-25 key segments (including 3-5 headers) that producers can expand with additional details.

${startTime ? `The show starts at ${startTime}.` : ''}

TEMPLATE STRUCTURE GOALS:
- Total of 15-25 items (including headers)
- 3-5 major section headers
- For each major section, generate 3-6 key segments that represent the core flow
- Focus on essential broadcast elements: opens, intros, main content blocks, transitions, breaks, teases, closes
- Producers will add additional detail rows between these key segments

CRITICAL GUIDELINES FOR HEADERS:
- Headers are ESSENTIAL for organizing rundowns into major sections
- ALWAYS start your rundown with a header
- Use headers to separate major sections like:
  * "TOP OF SHOW" - opening segments
  * "GAME 1", "GAME 2", "GAME 3" - for esports/sports
  * "ACT 1", "ACT 2", "ACT 3" - for narrative content
  * "BOTTOM OF SHOW" - closing segments
- Headers have type: "header", rowNumber: "A" (or letters), and ALL time/content fields must be EMPTY strings
- Headers are organizational markers, NOT segments with durations

EXAMPLE OF PROPER RUNDOWN STRUCTURE:
[
  {
    "id": "header_1751939845425_cy79eacen",
    "type": "header",
    "rowNumber": "A",
    "name": "TOP OF SHOW",
    // All time/content fields MUST be empty strings for headers
    "startTime": "", "duration": "", "endTime": "", "elapsedTime": "",
    "talent": "", "script": "", "gfx": "", "video": "", "images": "", "notes": "", "color": "",
    "isFloating": false,
    "customFields": {}
  },
  {
    "id": "item_1751939846001_abc123",
    "type": "regular",
    "rowNumber": "1",
    "name": "Show Open",
    "duration": "02:00",
    // These will be auto-calculated, leave empty
    "startTime": "", "endTime": "", "elapsedTime": "00:00",
    "talent": "Host: Alex", // Plain names only, NO [NAME {color}] formatting here
    "script": "[ALEX {Blue}]\nWelcome to the show! We've got an incredible lineup for you today.", // Use [NAME {color}] here
    "gfx": "Logo animation, Show title screen",
    "video": "Intro sizzle reel",
    "images": "", "notes": "", "color": "", // Empty fields can be left as ""
    "isFloating": false,
    "customFields": {"music": "Energetic Theme"} // Optional: add custom fields when relevant
  }
  // ... continue with more headers (B, C, D...) and regular items (2, 3, 4...) following this pattern
  // Remember: ALWAYS start with a header, use 3-5 headers total, 15-25 items overall
]

TALENT vs SCRIPT FORMATTING (CRITICAL):
- talent field: Plain comma-separated names ONLY
  Examples: "Host: Alex", "Casters Moxie & Rekkz", "Alex, Jamie, Mike"
- script field: Use [NAME {color}] format with CURLY BRACES before each person's dialogue
  
SCRIPT LINE BREAK RULES (CRITICAL):
- After [NAME {color}], press ENTER ONCE before starting dialogue
- Between different speakers, press ENTER TWICE (creating one blank line)
- Example with multiple speakers:
  [ALEX {Blue}]
  Welcome everyone to the show!
  
  [MOXIE {Green}]
  Thanks for having us!
  
  [REKKZ {Orange}]
  Let's get started!
  
NEVER put [NAME {color}] formatting in the talent field - it goes in the script field only!

Additional Guidelines:
- Include realistic durations in MM:SS format (e.g., "02:00", "05:30")
- Write professional broadcast scripts with proper talent color formatting
- Include realistic GFX, video, and notes when relevant
- Use segment names that match broadcast terminology
- Ensure logical flow and pacing
- Total runtime should be reasonable for the show type described
- Use rowNumber starting from "1" for regular items, use letters like "A", "B", "C" for headers
- Use customFields for things like music cues when appropriate

Return a structured array of rundown items with these fields:
- id: generate unique IDs using pattern like "item_1234567890_abc123" (timestamp + random string)
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
