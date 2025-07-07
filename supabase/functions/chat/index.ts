
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
    let conversationHistory: OpenAIMessage[] = []
    let supabase, user, teamId;
    
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        supabase = createClient(supabaseUrl, supabaseKey)

        const jwt = authHeader.replace('Bearer ', '')
        const { data: { user: userData } } = await supabase.auth.getUser(jwt)
        user = userData;
        
        if (user) {
          const { data: teamMemberships } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .limit(1)

          if (teamMemberships && teamMemberships.length > 0) {
            teamId = teamMemberships[0].team_id
            
            // Get the most recent conversations to maintain context
            const { data: recentConversations } = await supabase
              .from('team_conversations')
              .select('user_message, assistant_response')
              .eq('team_id', teamId)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(5) // Get last 5 exchanges

            if (recentConversations && recentConversations.length > 0) {
              // Add recent conversation history
              const conversationPairs = recentConversations.reverse() // Oldest first
              for (const conv of conversationPairs) {
                conversationHistory.push({
                  role: 'user',
                  content: conv.user_message
                })
                conversationHistory.push({
                  role: 'assistant', 
                  content: conv.assistant_response
                })
              }
              
              // Check for immediate context (last response had modification request)
              const lastConv = recentConversations[0]
              if (lastConv.assistant_response.includes('Apply this change?') && 
                  message.toLowerCase().match(/^(yes|apply|proceed|do it|go ahead|confirm|yes apply|apply it|yes apply it|apply this change)/)) {
                teamContext = `

IMMEDIATE CONTEXT: User just confirmed a modification request.
Apply the change using the APPLY_CHANGE format immediately.`
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching team context:', error)
      }
    }

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: getSystemPrompt(rundownData) + teamContext,
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message,
      },
    ]

    const aiMessage = await callOpenAI(messages, openaiApiKey)
    const cleaned = cleanMessage(aiMessage)

    // Store the conversation for future context if user is authenticated
    if (supabase && user && teamId) {
      try {
        // Store this conversation
        await supabase
          .from('team_conversations')
          .insert({
            team_id: teamId,
            user_id: user.id,
            user_message: message,
            assistant_response: cleaned,
            rundown_context: rundownData
          })
      } catch (error) {
        console.error('Error storing conversation:', error)
        // Continue anyway - don't let storage errors break the response
      }
    }

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
