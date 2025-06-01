
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { OpenAIMessage } from './types.ts';
import { getSystemPrompt } from './systemPrompt.ts';
import { callOpenAI } from './openaiClient.ts';
import { parseModifications, cleanMessage } from './modificationParser.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
        content: getSystemPrompt(rundownData)
      },
      {
        role: 'user',
        content: message
      }
    ]

    // Call OpenAI API
    const aiMessage = await callOpenAI(messages, openaiApiKey);

    // Extract modifications if present
    const modifications = parseModifications(aiMessage);
    const cleanedMessage = cleanMessage(aiMessage);

    return new Response(
      JSON.stringify({
        message: cleanedMessage,
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
