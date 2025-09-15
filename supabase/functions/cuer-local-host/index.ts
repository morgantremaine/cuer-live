import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocalSessionRequest {
  name: string;
  teamId: string;
  rundownId: string;
  allowedIPs?: string[];
}

// In-memory storage for active sessions (in production, use a database)
const activeSessions = new Map<string, {
  sessionId: string;
  pin: string;
  name: string;
  websocketUrl: string;
  qrData: any;
  teamId: string;
  rundownId: string;
  createdAt: number;
}>();

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateSessionId(): string {
  return crypto.randomUUID();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user authentication
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST') {
      // Create new local session
      const body: LocalSessionRequest = await req.json();
      const { name, teamId, rundownId, allowedIPs = [] } = body;

      // Verify user is admin of the team
      const { data: teamMember, error: teamError } = await supabaseClient
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single();

      if (teamError || !teamMember || teamMember.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const sessionId = generateSessionId();
      const pin = generatePin();
      const websocketUrl = `ws://localhost:1234/session/${sessionId}`;
      
      const qrData = {
        sessionId,
        pin,
        websocketUrl,
        teamId,
        rundownId,
        name
      };

      const session = {
        sessionId,
        pin,
        name,
        websocketUrl,
        qrData,
        teamId,
        rundownId,
        createdAt: Date.now()
      };

      activeSessions.set(sessionId, session);

      console.log(`Local session created: ${sessionId} for team ${teamId}`);

      return new Response(
        JSON.stringify(session),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'DELETE') {
      // End local session
      const body = await req.json();
      const { sessionId } = body;

      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: 'Session ID required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const session = activeSessions.get(sessionId);
      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Verify user has permission to end this session
      const { data: teamMember } = await supabaseClient
        .from('team_members')
        .select('role')
        .eq('team_id', session.teamId)
        .eq('user_id', user.id)
        .single();

      if (!teamMember || teamMember.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      activeSessions.delete(sessionId);

      console.log(`Local session ended: ${sessionId}`);

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'GET') {
      // List active sessions for team
      const url = new URL(req.url);
      const teamId = url.searchParams.get('teamId');

      if (!teamId) {
        return new Response(
          JSON.stringify({ error: 'Team ID required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Verify user is member of the team
      const { data: teamMember } = await supabaseClient
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single();

      if (!teamMember) {
        return new Response(
          JSON.stringify({ error: 'Team access required' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const teamSessions = Array.from(activeSessions.values())
        .filter(session => session.teamId === teamId);

      return new Response(
        JSON.stringify(teamSessions),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in cuer-local-host function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});