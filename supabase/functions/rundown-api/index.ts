import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function authenticateApiKey(supabase: any, authHeader: string | null): Promise<{ teamId: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.substring(7);

  const { data: keyData, error } = await supabase
    .from('team_api_keys')
    .select('team_id, permissions, expires_at')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .single();

  if (error || !keyData) {
    return null;
  }

  // Check if key is expired
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return null;
  }

  // Update last_used_at
  await supabase
    .from('team_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('api_key', apiKey);

  return { teamId: keyData.team_id };
}

function getCurrentSegment(items: any[], showcallerState: any) {
  if (!showcallerState?.currentSegmentId) {
    return items[0] || null;
  }

  return items.find(item => item.id === showcallerState.currentSegmentId) || null;
}

function getNextSegment(items: any[], currentSegment: any) {
  if (!currentSegment) return null;

  const currentIndex = items.findIndex(item => item.id === currentSegment.id);
  if (currentIndex === -1 || currentIndex === items.length - 1) {
    return null;
  }

  return items[currentIndex + 1] || null;
}

function formatSegment(segment: any) {
  if (!segment) return null;

  return {
    id: segment.id,
    slug: segment.slug || segment.name?.toLowerCase().replace(/\s+/g, '_'),
    name: segment.name,
    row_number: segment.row_number,
    duration: segment.duration,
    start_time: segment.start_time,
    end_time: segment.end_time,
    talent: segment.talent,
    gfx: segment.gfx,
    template: segment.template,
    custom_fields: {
      music: segment.music,
      camera: segment.camera,
      notes: segment.notes,
    },
  };
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

    // Authenticate API key
    const authResult = await authenticateApiKey(supabase, req.headers.get('authorization'));
    if (!authResult) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing API key' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Expected format: /rundown/{id}/{endpoint}
    if (pathParts.length < 2 || pathParts[0] !== 'rundown') {
      return new Response(
        JSON.stringify({ error: 'Invalid endpoint' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const rundownId = pathParts[1];
    const endpoint = pathParts[2];

    // Fetch rundown data
    const { data: rundown, error: rundownError } = await supabase
      .from('rundowns')
      .select('*')
      .eq('id', rundownId)
      .eq('team_id', authResult.teamId)
      .single();

    if (rundownError || !rundown) {
      return new Response(
        JSON.stringify({ error: 'Rundown not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const items = rundown.items || [];
    const showcallerState = rundown.showcaller_state || {};
    const currentSegment = getCurrentSegment(items, showcallerState);
    const nextSegment = getNextSegment(items, currentSegment);

    switch (endpoint) {
      case 'current':
        return new Response(
          JSON.stringify({
            rundown: {
              id: rundown.id,
              title: rundown.title,
              start_time: rundown.start_time,
            },
            current_segment: formatSegment(currentSegment),
            showcaller_state: {
              is_playing: showcallerState.isPlaying || false,
              time_remaining: showcallerState.timeRemaining,
              playback_start_time: showcallerState.playbackStartTime,
              controller_id: showcallerState.controllerId,
            },
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'next':
        return new Response(
          JSON.stringify({
            rundown: {
              id: rundown.id,
              title: rundown.title,
            },
            next_segment: formatSegment(nextSegment),
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'state':
        return new Response(
          JSON.stringify({
            rundown: {
              id: rundown.id,
              title: rundown.title,
              start_time: rundown.start_time,
              timezone: rundown.timezone,
              total_segments: items.length,
            },
            current_segment: formatSegment(currentSegment),
            next_segment: formatSegment(nextSegment),
            showcaller_state: {
              is_playing: showcallerState.isPlaying || false,
              time_remaining: showcallerState.timeRemaining,
              playback_start_time: showcallerState.playbackStartTime,
              controller_id: showcallerState.controllerId,
              current_segment_id: showcallerState.currentSegmentId,
            },
            segments: items.map(formatSegment),
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown endpoint' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('Error in rundown-api function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});