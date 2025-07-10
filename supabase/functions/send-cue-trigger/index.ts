import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CuePayload {
  event: string;
  timestamp: string;
  rundown: {
    id: string;
    title: string;
    start_time?: string;
  };
  current_segment: {
    id: string;
    slug?: string;
    name?: string;
    row_number?: string;
    duration?: string;
    start_time?: string;
    end_time?: string;
    talent?: string;
    gfx?: string;
    template?: string;
    custom_fields?: Record<string, any>;
  };
  next_segment?: {
    id: string;
    name?: string;
    duration?: string;
  };
  showcaller_state: {
    is_playing: boolean;
    time_remaining?: number;
    playback_start_time?: number;
    controller_id?: string;
  };
}

interface Integration {
  id: string;
  integration_type: 'webhook' | 'osc';
  endpoint_url?: string;
  http_method?: string;
  auth_headers?: Record<string, string>;
  custom_headers?: Record<string, string>;
  osc_host?: string;
  osc_port?: number;
  osc_path?: string;
  rate_limit_per_minute: number;
  retry_attempts: number;
  is_active: boolean;
}

interface RequestBody {
  teamId: string;
  rundownId: string;
  payload: CuePayload;
}

async function sendWebhook(integration: Integration, payload: CuePayload): Promise<{
  success: boolean;
  status?: number;
  responseBody?: string;
  error?: string;
  responseTime: number;
}> {
  const startTime = Date.now();
  
  try {
    console.log(`Sending webhook to: ${integration.endpoint_url}`);
    
    // Check for localhost URLs which won't work from edge functions
    if (integration.endpoint_url?.includes('localhost') || integration.endpoint_url?.includes('127.0.0.1')) {
      console.warn('Localhost URL detected - edge functions cannot reach localhost');
      return {
        success: false,
        error: 'Cannot reach localhost URLs from edge functions. Use ngrok or a public URL for testing.',
        responseTime: Date.now() - startTime,
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...integration.custom_headers,
      ...integration.auth_headers,
    };

    const response = await fetch(integration.endpoint_url!, {
      method: integration.http_method || 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();
    const responseTime = Date.now() - startTime;

    console.log(`Webhook response: ${response.status} - ${responseBody.substring(0, 200)}`);

    return {
      success: response.ok,
      status: response.status,
      responseBody: responseBody.substring(0, 1000), // Limit response size
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`Webhook error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      responseTime,
    };
  }
}

async function sendOSC(integration: Integration, payload: CuePayload): Promise<{
  success: boolean;
  error?: string;
  responseTime: number;
}> {
  const startTime = Date.now();
  
  try {
    // Create OSC message - simplified JSON payload over WebSocket
    const oscMessage = {
      address: integration.osc_path || '/cue',
      args: [
        payload.event,
        payload.current_segment.id,
        payload.current_segment.name || '',
        payload.showcaller_state.is_playing ? 1 : 0,
        payload.showcaller_state.time_remaining || 0,
      ],
      payload: payload, // Include full payload for advanced OSC clients
    };

    // For now, use HTTP POST to OSC bridge endpoint
    // In production, this would use UDP or WebSocket to OSC server
    const oscEndpoint = `http://${integration.osc_host}:${integration.osc_port || 3333}/osc`;
    
    const response = await fetch(oscEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(oscMessage),
    });

    const responseTime = Date.now() - startTime;
    
    return {
      success: response.ok,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      error: error.message,
      responseTime,
    };
  }
}

async function logCueEvent(
  supabase: any,
  teamId: string,
  rundownId: string,
  integration: Integration,
  payload: CuePayload,
  result: any
) {
  try {
    await supabase.from('cue_logs').insert({
      rundown_id: rundownId,
      team_id: teamId,
      integration_id: integration.id,
      segment_id: payload.current_segment.id,
      event_type: payload.event,
      payload: payload,
      endpoint_url: integration.endpoint_url || `${integration.osc_host}:${integration.osc_port}`,
      response_status: result.status,
      response_body: result.responseBody,
      error_message: result.error,
      response_time_ms: result.responseTime,
    });
  } catch (error) {
    console.error('Failed to log cue event:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { teamId, rundownId, payload }: RequestBody = await req.json();

    if (!teamId || !rundownId || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get active integrations for the team
    const { data: integrations, error } = await supabase
      .from('team_integrations')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to fetch integrations:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch integrations' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const results = [];

    // Send to each active integration
    for (const integration of integrations || []) {
      let result;
      
      if (integration.integration_type === 'webhook') {
        result = await sendWebhook(integration, payload);
      } else if (integration.integration_type === 'osc') {
        result = await sendOSC(integration, payload);
      }

      if (result) {
        // Log the event
        await logCueEvent(supabase, teamId, rundownId, integration, payload, result);
        
        results.push({
          integration_id: integration.id,
          type: integration.integration_type,
          success: result.success,
          response_time: result.responseTime,
          error: result.error,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        integrations_sent: results.length,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-cue-trigger function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});