import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OperationData {
  rundownId: string;
  operationType: 'CELL_EDIT' | 'ROW_INSERT' | 'ROW_DELETE' | 'ROW_MOVE' | 'ROW_COPY' | 'GLOBAL_EDIT';
  operationData: any;
  userId: string;
  clientId: string;
  timestamp: number;
}

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

    const operation: OperationData = await req.json();

    console.log('🚀 OPERATION RECEIVED:', {
      type: operation.operationType,
      rundownId: operation.rundownId,
      userId: operation.userId,
      clientId: operation.clientId,
      timestamp: operation.timestamp
    });

    // Verify user has access to rundown
    const { data: rundown, error: rundownError } = await supabaseClient
      .from('rundowns')
      .select('*')
      .eq('id', operation.rundownId)
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

    // Get next sequence number
    const { data: sequenceData, error: sequenceError } = await supabaseClient
      .rpc('get_next_sequence_number');

    if (sequenceError) {
      throw new Error('Failed to get sequence number');
    }

    const sequenceNumber = sequenceData;

    // Apply operation to rundown
    const updatedRundown = await applyOperationToRundown(rundown, operation);

    // Update rundown in database
    const { error: updateError } = await supabaseClient
      .from('rundowns')
      .update({
        items: updatedRundown.items,
        title: updatedRundown.title,
        start_time: updatedRundown.start_time,
        timezone: updatedRundown.timezone,
        show_date: updatedRundown.show_date,
        external_notes: updatedRundown.external_notes,
        updated_at: new Date().toISOString(),
        last_updated_by: userData.user.id
      })
      .eq('id', operation.rundownId);

    if (updateError) {
      throw new Error('Failed to update rundown');
    }

    // Log operation
    const { error: logError } = await supabaseClient
      .from('rundown_operations')
      .insert({
        rundown_id: operation.rundownId,
        user_id: operation.userId,
        operation_type: operation.operationType,
        operation_data: operation.operationData,
        client_id: operation.clientId,
        sequence_number: sequenceNumber,
        applied_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Failed to log operation:', logError);
      // Don't fail the request, just log the error
    }

    // Broadcast operation to other clients via realtime
    const broadcastPayload = {
      type: 'operation_applied',
      operation: {
        ...operation,
        sequenceNumber,
        appliedAt: new Date().toISOString()
      },
      rundownId: operation.rundownId
    };

    console.log('📡 BROADCASTING OPERATION:', broadcastPayload.type);

    // Return success response immediately
    const response = {
      success: true,
      sequenceNumber,
      appliedAt: new Date().toISOString(),
      operationType: operation.operationType
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ OPERATION ERROR:', error);
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

function applyOperationToRundown(rundown: any, operation: OperationData): any {
  const updatedRundown = { ...rundown };

  switch (operation.operationType) {
    case 'CELL_EDIT':
      updatedRundown.items = applyCellEdit(rundown.items, operation.operationData);
      break;
    
    case 'ROW_INSERT':
      updatedRundown.items = applyRowInsert(rundown.items, operation.operationData);
      break;
    
    case 'ROW_DELETE':
      updatedRundown.items = applyRowDelete(rundown.items, operation.operationData);
      break;
    
    case 'ROW_MOVE':
      updatedRundown.items = applyRowMove(rundown.items, operation.operationData);
      break;
    
    case 'ROW_COPY':
      updatedRundown.items = applyRowCopy(rundown.items, operation.operationData);
      break;
    
    case 'GLOBAL_EDIT':
      Object.assign(updatedRundown, operation.operationData);
      break;
    
    default:
      throw new Error(`Unknown operation type: ${operation.operationType}`);
  }

  return updatedRundown;
}

function applyCellEdit(items: any[], operationData: any): any[] {
  const { itemId, field, newValue } = operationData;
  
  return items.map(item => {
    if (item.id === itemId) {
      return { ...item, [field]: newValue };
    }
    return item;
  });
}

function applyRowInsert(items: any[], operationData: any): any[] {
  const { insertIndex, newItem } = operationData;
  const newItems = [...items];
  newItems.splice(insertIndex, 0, newItem);
  return newItems;
}

function applyRowDelete(items: any[], operationData: any): any[] {
  const { itemId } = operationData;
  return items.filter(item => item.id !== itemId);
}

function applyRowMove(items: any[], operationData: any): any[] {
  const { fromIndex, toIndex } = operationData;
  const newItems = [...items];
  const [movedItem] = newItems.splice(fromIndex, 1);
  newItems.splice(toIndex, 0, movedItem);
  return newItems;
}

function applyRowCopy(items: any[], operationData: any): any[] {
  const { sourceItemId, newItem, insertIndex } = operationData;
  const newItems = [...items];
  newItems.splice(insertIndex, 0, newItem);
  return newItems;
}