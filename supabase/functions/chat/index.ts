
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

When you suggest modifications to the rundown, format them as JSON in your response like this:
MODIFICATIONS: [{"type": "update", "itemId": "123", "data": {"script": "New script content"}, "description": "Updated script for better flow"}]

Available modification types:
- "add": Add new rundown item
- "update": Update existing item (provide itemId)
- "delete": Delete item (provide itemId)

Current rundown context: ${rundownData ? JSON.stringify(rundownData) : 'No rundown data provided'}`
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
        temperature: 0.7,
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
      } catch (e) {
        console.error('Failed to parse modifications:', e)
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
