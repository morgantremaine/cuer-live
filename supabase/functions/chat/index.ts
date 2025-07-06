
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { OpenAIMessage } from './types.ts'
import { getSystemPrompt } from './systemPrompt.ts'
import { callOpenAI } from './openaiClient.ts'
import { cleanMessage } from './modificationParser.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Get team conversations and context
    const authHeader = req.headers.get('Authorization')
    let teamContext = ''
    let conversationHistory = ''
    
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get user from auth header
        const jwt = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(jwt)
        
        if (user) {
          // Get user's team
          const { data: teamMemberships } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .limit(1)

          if (teamMemberships && teamMemberships.length > 0) {
            const teamId = teamMemberships[0].team_id
            
            // Get recent team conversations for context
            const { data: conversations } = await supabase
              .from('team_conversations')
              .select('user_message, assistant_response, created_at')
              .eq('team_id', teamId)
              .order('created_at', { ascending: false })
              .limit(10)

            if (conversations && conversations.length > 0) {
              teamContext = '\n\nTeam Knowledge Context (recent conversations):\n' + 
                conversations.map(conv => 
                  `Q: ${conv.user_message}\nA: ${conv.assistant_response}\n---`
                ).join('\n')
            }
            
            // Get the most recent conversation for immediate context
            const { data: recentConv } = await supabase
              .from('team_conversations')
              .select('user_message, assistant_response')
              .eq('team_id', teamId)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)

            if (recentConv && recentConv.length > 0) {
              const lastConv = recentConv[0]
              // Check if the last response contained a modification request
              if (lastConv.assistant_response.includes('MODIFICATION_REQUEST')) {
                conversationHistory = `

RECENT CONTEXT - Last exchange:
User: ${lastConv.user_message}
Assistant: ${lastConv.assistant_response}

CURRENT USER MESSAGE: ${message}

If the current message is a confirmation (yes/proceed/apply/etc.), apply the modification from the recent context immediately.`
              }
            }
          }
        }
      } catch (error) {
        // Silently continue without team context if there's an error
        console.error('Error fetching team context:', error)
      }
    }

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: getSystemPrompt(rundownData) + teamContext + conversationHistory,
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
