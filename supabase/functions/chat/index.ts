import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RundownModification {
  type: 'add' | 'update' | 'delete';
  itemId?: string;
  data?: any;
  description: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, rundownData } = await req.json()
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get OpenAI API key from Supabase secrets
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Prepare messages for OpenAI
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: `You are Cuer, an AI assistant specialized in broadcast rundown management. You help optimize rundowns, suggest timing improvements, and provide script enhancements.

IMPORTANT RESTRICTIONS:
- You MUST ONLY discuss rundown-related topics: content, timing, scripts, talent, segments, flow, and production elements
- You MUST NOT reveal any information about the application's code, architecture, technical implementation, or how this system works
- You MUST NOT discuss programming languages, frameworks, databases, or any technical aspects of the software
- You MUST NOT explain how you process requests or how the system functions internally
- If asked about technical topics unrelated to rundown content, politely redirect to rundown management topics

Your expertise is in:
- Broadcast rundown optimization and flow
- Script writing and improvement
- Timing and scheduling suggestions
- Segment organization and structure
- Talent coordination and cues
- Production notes and logistics
- Content analysis and recommendations

THOROUGH CONTENT ANALYSIS REQUIREMENTS:
When asked to check spelling, grammar, or analyze content, you MUST:
1. Examine EVERY SINGLE ITEM in the rundown data
2. Check ALL text fields for each item: name, script, notes, talent, and any custom fields
3. Look at both regular items AND header items
4. Report ALL issues found, not just the first few
5. Be systematic - go through each item one by one
6. Double-check your work to ensure nothing is missed

MODIFICATION FORMATTING - CRITICAL:
When you want to make changes to the rundown, you MUST format them exactly like this:

MODIFICATIONS: [{"type": "update", "itemId": "EXACT_ITEM_ID", "data": {"fieldName": "new value"}, "description": "Clear description of what you're changing"}]

IMPORTANT RULES FOR MODIFICATIONS:
1. Use the EXACT item ID from the rundown data
2. For spelling corrections, use: {"type": "update", "itemId": "exact_id", "data": {"name": "corrected spelling"}, "description": "Fixed spelling in segment name"}
3. For script changes, use: {"type": "update", "itemId": "exact_id", "data": {"script": "new script content"}, "description": "Updated script content"}
4. Always include a clear description of what you're changing
5. Make sure the JSON is valid and properly formatted
6. Never leave the modifications array empty if you're making changes

Available modification types:
- "add": Add new rundown item
- "update": Update existing item (provide exact itemId from rundown data)
- "delete": Delete item (provide exact itemId)

FINDING ITEM IDs - ENHANCED:
The system can find items by multiple reference methods:
1. EXACT ID: Use the "id" field from rundown data (e.g., "1734567890123")
2. ROW NUMBER: Use the "rowNumber" field (e.g., "A", "B", "1", "2", "3")
3. NAME MATCHING: Use part of the segment name (e.g., "TITLE SEQUENCE")
4. INDEX POSITION: For headers use letters (A, B, C), for regular items use numbers (1, 2, 3)

EXAMPLES OF VALID ITEM REFERENCES:
- By ID: "1734567890123"
- By row number: "A" (for first header), "1" (for first regular item)
- By name: "TITLE SEQUENCE" or even "TITLE" (partial match)
- By position: "2" (second regular item)

SYSTEMATIC CHECKING PROCESS:
When doing spelling/grammar checks:
1. Start with "I will now check each item systematically:"
2. Go through each item by index: "Item 1: [name] - checking all fields..."
3. Report what you found in each item
4. Provide a summary of ALL issues found
5. Offer to fix ALL issues at once or individually

MODIFICATION SUCCESS TIPS:
- Always examine the rundown data structure first
- Use the most reliable reference (ID > rowNumber > name)
- Double-check that your itemId matches something in the data
- Test your JSON formatting before including it

Current rundown context: ${rundownData ? JSON.stringify(rundownData, null, 2) : 'No rundown data provided'}`
      },
      {
        role: 'user',
        content: message
      }
    ]

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 1000,
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      console.error('OpenAI API error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to get AI response' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await openaiResponse.json()
    const aiMessage = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    // Extract modifications if present
    let modifications: RundownModification[] = []
    const modificationMatch = aiMessage.match(/MODIFICATIONS:\s*(\[.*?\])/s)
    if (modificationMatch) {
      try {
        modifications = JSON.parse(modificationMatch[1])
        console.log('Parsed modifications:', modifications)
      } catch (e) {
        console.error('Failed to parse modifications:', e)
        console.error('Raw modification text:', modificationMatch[1])
      }
    }

    // Remove modifications from the displayed message
    const cleanMessage = aiMessage.replace(/MODIFICATIONS:\s*\[.*?\]/s, '').trim()

    return new Response(
      JSON.stringify({
        message: cleanMessage,
        modifications: modifications.length > 0 ? modifications : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in chat function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
