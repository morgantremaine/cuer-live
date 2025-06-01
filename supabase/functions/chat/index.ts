
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { OpenAIMessage } from './types.ts'
import { getSystemPrompt } from './systemPrompt.ts'
import { callOpenAI } from './openaiClient.ts'
import { cleanMessage } from './cleanMessage.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, rundownData } = await req.json()

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    let userId = null
    let chatHistory = []
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      userId = user?.id
      
      // Get recent chat history for context
      if (userId) {
        const { data } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)
        
        chatHistory = data?.reverse() || []
      }
    }

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: getSystemPrompt(rundownData, chatHistory),
      },
      {
        role: 'user',
        content: message,
      },
    ]

    const aiMessage = await callOpenAI(messages, openaiApiKey)
    const cleaned = cleanMessage(aiMessage)

    return new Response(
      JSON.stringify({ message: cleaned }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in chat function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
