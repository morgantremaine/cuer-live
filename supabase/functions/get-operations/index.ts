import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !userData.user) {
      throw new Error('Authentication failed');
    }

    // Parse request body
    const body = await req.json();
    const rundownId = body.rundownId;
    const sinceSequence = body.sinceSequence || '0';

    if (!rundownId) {
      throw new Error('rundownId parameter required');
    }

    console.log('📥 GET OPERATIONS:', {
      rundownId,
      sinceSequence,
      userId: userData.user.id
    });

    // Verify user has access to rundown
    const { data: rundown, error: rundownError } = await supabaseClient
      .from('rundowns')
      .select('user_id, team_id, operation_mode_enabled')
      .eq('id', rundownId)
      .single();

    if (rundownError || !rundown) {
      throw new Error('Rundown not found');
    }

    // Check access permissions
    const hasAccess = rundown.user_id === userData.user.id || 
      (rundown.team_id && await checkTeamAccess(supabaseClient, userData.user.id, rundown.team_id));

    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Check if rundown has operation mode enabled
    if (!rundown.operation_mode_enabled) {
      throw new Error('Operation mode not enabled for this rundown');
    }

    // Get operations since sequence number
    const { data: operations, error: operationsError } = await supabaseClient
      .from('rundown_operations')
      .select('*')
      .eq('rundown_id', rundownId)
      .gt('sequence_number', parseInt(sinceSequence))
      .order('sequence_number', { ascending: true })
      .limit(100); // Limit to prevent large responses

    if (operationsError) {
      throw new Error('Failed to fetch operations');
    }

    console.log('📤 RETURNING OPERATIONS:', {
      count: operations?.length || 0,
      sinceSequence
    });

    // Transform database records (snake_case) to client format (camelCase)
    const transformedOperations = (operations || []).map((op: any) => ({
      id: op.id,
      operationType: op.operation_type,
      operationData: op.operation_data,
      rundownId: op.rundown_id,
      userId: op.user_id,
      clientId: op.client_id,
      sequenceNumber: op.sequence_number,
      appliedAt: op.applied_at,
      createdAt: op.created_at
    }));

    return new Response(JSON.stringify({
      success: true,
      operations: transformedOperations,
      latestSequence: operations && operations.length > 0 
        ? operations[operations.length - 1].sequence_number 
        : parseInt(sinceSequence)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ GET OPERATIONS ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function checkTeamAccess(supabaseClient: any, userId: string, teamId: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('team_members')
    .select('id')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .single();

  return !error && !!data;
}