
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
            
            // Get the most recent conversation to check for pending modifications
            const { data: recentConv } = await supabase
              .from('team_conversations')
              .select('user_message, assistant_response')
              .eq('team_id', teamId)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)

            if (recentConv && recentConv.length > 0) {
              const lastConv = recentConv[0]
              
              // Check if the last response contained a modification request and current message is a confirmation
              if (lastConv.assistant_response.includes('Would you like me to apply this change') && 
                  message.toLowerCase().match(/^(yes|apply|proceed|do it|go ahead|confirm|yes apply|apply it|yes apply it)/)) {
                teamContext = `

IMMEDIATE CONTEXT: The user just confirmed a modification request from the previous conversation.
Last request: ${lastConv.user_message}
User is now saying: ${message}

APPLY THE MODIFICATION IMMEDIATELY using MODIFICATION_REQUEST format. Do not ask for confirmation again.`
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
