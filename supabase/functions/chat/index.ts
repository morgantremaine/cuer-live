
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
