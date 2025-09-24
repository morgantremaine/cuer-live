import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface ShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  lastUpdated: number;
  isController: boolean;
  timestamp: number;
}

serve(async (req) => {
  console.log('🎛️ Stream Deck API request:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Handle both local and deployed URL patterns
    let path = url.pathname;
    if (path.startsWith('/functions/v1/stream-deck-api')) {
      path = path.replace('/functions/v1/stream-deck-api', '');
    } else if (path.startsWith('/stream-deck-api')) {
      path = path.replace('/stream-deck-api', '');
    }
    path = path || '/';
    
    console.log('📍 Full URL:', req.url);
    console.log('📍 Pathname:', url.pathname);
    console.log('📍 Extracted path:', path);

    // Extract authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Authenticated user:', user.id);

    // Route handling
    if (path === '/rundowns' && req.method === 'GET') {
      return await handleGetRundowns(user.id);
    }

    if (path.startsWith('/status/') && req.method === 'GET') {
      const rundownId = path.split('/')[2];
      return await handleGetStatus(rundownId, user.id);
    }

    if (path.startsWith('/play/') && req.method === 'POST') {
      const rundownId = path.split('/')[2];
      const body = await req.json().catch(() => ({}));
      return await handlePlay(rundownId, user.id, body.segmentId);
    }

    if (path.startsWith('/pause/') && req.method === 'POST') {
      const rundownId = path.split('/')[2];
      return await handlePause(rundownId, user.id);
    }

    if (path.startsWith('/forward/') && req.method === 'POST') {
      const rundownId = path.split('/')[2];
      return await handleForward(rundownId, user.id);
    }

    if (path.startsWith('/backward/') && req.method === 'POST') {
      const rundownId = path.split('/')[2];
      return await handleBackward(rundownId, user.id);
    }

    if (path.startsWith('/reset/') && req.method === 'POST') {
      const rundownId = path.split('/')[2];
      return await handleReset(rundownId, user.id);
    }

    if (path.startsWith('/jump/') && req.method === 'POST') {
      const rundownId = path.split('/')[2];
      const body = await req.json();
      return await handleJump(rundownId, user.id, body.segmentId);
    }

    console.log('❌ Endpoint not found:', path);
    console.log('📋 Available endpoints:');
    console.log('  GET /rundowns');
    console.log('  GET /status/{rundownId}');
    console.log('  POST /play/{rundownId}');
    console.log('  POST /pause/{rundownId}');
    console.log('  POST /forward/{rundownId}');
    console.log('  POST /backward/{rundownId}');
    console.log('  POST /reset/{rundownId}');
    console.log('  POST /jump/{rundownId}');
    
    return new Response(JSON.stringify({ 
      error: 'Endpoint not found', 
      path: path,
      availableEndpoints: [
        'GET /rundowns',
        'GET /status/{rundownId}',
        'POST /play/{rundownId}',
        'POST /pause/{rundownId}',
        'POST /forward/{rundownId}',
        'POST /backward/{rundownId}',
        'POST /reset/{rundownId}',
        'POST /jump/{rundownId}'
      ]
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Stream Deck API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleGetRundowns(userId: string) {
  console.log('📋 Getting rundowns for user:', userId);
  
  // Get user's team IDs first
  const teamIds = await getUserTeamIds(userId);
  console.log('👥 User team IDs:', teamIds);
  
  let query = supabase
    .from('rundowns')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20);
  
  // Build the OR condition based on whether user has teams
  if (teamIds) {
    query = query.or(`user_id.eq.${userId},team_id.in.(${teamIds})`);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data: rundowns, error } = await query;

  if (error) {
    console.error('❌ Error fetching rundowns:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch rundowns' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('✅ Found rundowns:', rundowns?.length || 0);
  return new Response(JSON.stringify({ rundowns }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleGetStatus(rundownId: string, userId: string) {
  console.log('📊 Getting status for rundown:', rundownId);
  
  // Verify user has access to this rundown
  const hasAccess = await verifyRundownAccess(rundownId, userId);
  if (!hasAccess) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: rundown, error } = await supabase
    .from('rundowns')
    .select('showcaller_state, items, title')
    .eq('id', rundownId)
    .single();

  if (error) {
    console.error('❌ Error fetching rundown:', error);
    return new Response(JSON.stringify({ error: 'Rundown not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const showcallerState = rundown.showcaller_state as ShowcallerState || {
    isPlaying: false,
    currentSegmentId: null,
    timeRemaining: 0,
    lastUpdated: Date.now(),
    isController: false,
    timestamp: Date.now()
  };

  const items = rundown.items || [];
  const currentItem = showcallerState.currentSegmentId 
    ? items.find((item: any) => item.id === showcallerState.currentSegmentId)
    : null;

  return new Response(JSON.stringify({
    status: showcallerState,
    currentItem,
    rundownTitle: rundown.title
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handlePlay(rundownId: string, userId: string, segmentId?: string) {
  console.log('▶️ Play command for rundown:', rundownId, 'segment:', segmentId);
  
  const hasAccess = await verifyRundownAccess(rundownId, userId);
  if (!hasAccess) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: rundown } = await supabase
    .from('rundowns')
    .select('showcaller_state, items')
    .eq('id', rundownId)
    .single();

  const currentState = rundown?.showcaller_state as ShowcallerState || {};
  const items = rundown?.items || [];
  
  // Determine which segment to play
  let targetSegmentId = segmentId || currentState.currentSegmentId;
  if (!targetSegmentId && items.length > 0) {
    // Start with first regular, non-floated item
    const firstItem = items.find((item: any) => item.type === 'regular' && !item.isFloating);
    targetSegmentId = firstItem?.id || null;
  }

  const newState = {
    ...currentState,
    isPlaying: true,
    currentSegmentId: targetSegmentId,
    lastUpdated: Date.now(),
    timestamp: Date.now(),
    isController: true
  };

  await updateShowcallerState(rundownId, newState);
  
  return new Response(JSON.stringify({ success: true, state: newState }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handlePause(rundownId: string, userId: string) {
  console.log('⏸️ Pause command for rundown:', rundownId);
  
  const hasAccess = await verifyRundownAccess(rundownId, userId);
  if (!hasAccess) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: rundown } = await supabase
    .from('rundowns')
    .select('showcaller_state')
    .eq('id', rundownId)
    .single();

  const currentState = rundown?.showcaller_state as ShowcallerState || {};
  
  const newState = {
    ...currentState,
    isPlaying: false,
    lastUpdated: Date.now(),
    timestamp: Date.now(),
    isController: true
  };

  await updateShowcallerState(rundownId, newState);
  
  return new Response(JSON.stringify({ success: true, state: newState }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleForward(rundownId: string, userId: string) {
  console.log('⏭️ Forward command for rundown:', rundownId);
  
  const hasAccess = await verifyRundownAccess(rundownId, userId);
  if (!hasAccess) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: rundown } = await supabase
    .from('rundowns')
    .select('showcaller_state, items')
    .eq('id', rundownId)
    .single();

  const currentState = rundown?.showcaller_state as ShowcallerState || {};
  const items = rundown?.items || [];
  
  // Find next regular, non-floated item
  let nextSegmentId = null;
  if (currentState.currentSegmentId) {
    const currentIndex = items.findIndex((item: any) => item.id === currentState.currentSegmentId);
    for (let i = currentIndex + 1; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating) {
        nextSegmentId = item.id;
        break;
      }
    }
  }

  const newState = {
    ...currentState,
    currentSegmentId: nextSegmentId || currentState.currentSegmentId,
    lastUpdated: Date.now(),
    timestamp: Date.now(),
    isController: true
  };

  await updateShowcallerState(rundownId, newState);
  
  return new Response(JSON.stringify({ success: true, state: newState }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleBackward(rundownId: string, userId: string) {
  console.log('⏮️ Backward command for rundown:', rundownId);
  
  const hasAccess = await verifyRundownAccess(rundownId, userId);
  if (!hasAccess) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: rundown } = await supabase
    .from('rundowns')
    .select('showcaller_state, items')
    .eq('id', rundownId)
    .single();

  const currentState = rundown?.showcaller_state as ShowcallerState || {};
  const items = rundown?.items || [];
  
  // Find previous regular, non-floated item
  let prevSegmentId = null;
  if (currentState.currentSegmentId) {
    const currentIndex = items.findIndex((item: any) => item.id === currentState.currentSegmentId);
    for (let i = currentIndex - 1; i >= 0; i--) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating) {
        prevSegmentId = item.id;
        break;
      }
    }
  }

  const newState = {
    ...currentState,
    currentSegmentId: prevSegmentId || currentState.currentSegmentId,
    lastUpdated: Date.now(),
    timestamp: Date.now(),
    isController: true
  };

  await updateShowcallerState(rundownId, newState);
  
  return new Response(JSON.stringify({ success: true, state: newState }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleReset(rundownId: string, userId: string) {
  console.log('🔄 Reset command for rundown:', rundownId);
  
  const hasAccess = await verifyRundownAccess(rundownId, userId);
  if (!hasAccess) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: rundown } = await supabase
    .from('rundowns')
    .select('items')
    .eq('id', rundownId)
    .single();

  const items = rundown?.items || [];
  const firstItem = items.find((item: any) => item.type === 'regular' && !item.isFloating);

  const newState = {
    isPlaying: false,
    currentSegmentId: firstItem?.id || null,
    timeRemaining: 0,
    lastUpdated: Date.now(),
    timestamp: Date.now(),
    isController: true
  };

  await updateShowcallerState(rundownId, newState);
  
  return new Response(JSON.stringify({ success: true, state: newState }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleJump(rundownId: string, userId: string, segmentId: string) {
  console.log('🎯 Jump command for rundown:', rundownId, 'to segment:', segmentId);
  
  const hasAccess = await verifyRundownAccess(rundownId, userId);
  if (!hasAccess) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: rundown } = await supabase
    .from('rundowns')
    .select('showcaller_state, items')
    .eq('id', rundownId)
    .single();

  const currentState = rundown?.showcaller_state as ShowcallerState || {};
  const items = rundown?.items || [];
  
  // Verify segment exists
  const targetItem = items.find((item: any) => item.id === segmentId);
  if (!targetItem) {
    return new Response(JSON.stringify({ error: 'Segment not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const newState = {
    ...currentState,
    currentSegmentId: segmentId,
    lastUpdated: Date.now(),
    timestamp: Date.now(),
    isController: true
  };

  await updateShowcallerState(rundownId, newState);
  
  return new Response(JSON.stringify({ success: true, state: newState }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function updateShowcallerState(rundownId: string, state: ShowcallerState) {
  console.log('💾 Updating showcaller state for rundown:', rundownId);
  
  const { error } = await supabase
    .from('rundowns')
    .update({ 
      showcaller_state: state,
      updated_at: new Date().toISOString()
    })
    .eq('id', rundownId);

  if (error) {
    console.error('❌ Error updating showcaller state:', error);
    throw error;
  }
}

async function verifyRundownAccess(rundownId: string, userId: string): Promise<boolean> {
  const { data: rundown } = await supabase
    .from('rundowns')
    .select('user_id, team_id')
    .eq('id', rundownId)
    .single();

  if (!rundown) return false;

  // Check if user owns the rundown
  if (rundown.user_id === userId) return true;

  // Check if user is a team member
  if (rundown.team_id) {
    const { data: membership } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', rundown.team_id)
      .eq('user_id', userId)
      .single();

    return !!membership;
  }

  return false;
}

async function getUserTeamIds(userId: string): Promise<string> {
  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);

  if (!memberships || memberships.length === 0) return '';
  
  return memberships.map(m => m.team_id).join(',');
}