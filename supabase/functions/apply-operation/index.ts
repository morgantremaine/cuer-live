import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OperationData {
  id: string;
  rundownId: string;
  operationType: 'CELL_EDIT' | 'ROW_INSERT' | 'ROW_DELETE' | 'ROW_MOVE' | 'ROW_COPY' | 'GLOBAL_EDIT';
  operationData: any;
  userId: string;
  clientId: string;
  timestamp: number;
}

interface BatchRequest {
  rundownId: string;
  operations: OperationData[];
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

    const batchRequest: BatchRequest = await req.json();
    const operations = batchRequest.operations;

    console.log('🚀 BATCH RECEIVED:', {
      rundownId: batchRequest.rundownId,
      operationCount: operations.length,
      firstOp: operations[0]?.operationType,
      timestamp: Date.now()
    });

    // Verify user has access to rundown
    const { data: rundown, error: rundownError } = await supabaseClient
      .from('rundowns')
      .select('*')
      .eq('id', batchRequest.rundownId)
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

    // Apply all operations in sequence
    let currentRundown = rundown;
    const appliedOperations = [];
    
    for (const operation of operations) {
      // Get next sequence number
      const { data: sequenceData } = await supabaseClient.rpc('get_next_sequence_number');
      const sequenceNumber = sequenceData;

      // Apply operation
      currentRundown = applyOperationToRundown(currentRundown, operation);

      // Log operation
      const { error: logError } = await supabaseClient
        .from('rundown_operations')
        .insert({
          rundown_id: batchRequest.rundownId,
          user_id: operation.userId,
          operation_type: operation.operationType,
          operation_data: operation.operationData,
          client_id: operation.clientId,
          sequence_number: sequenceNumber,
          applied_at: new Date().toISOString()
        });

      if (logError) {
        console.error('Failed to log operation:', logError);
      }

      appliedOperations.push({
        ...operation,
        sequenceNumber,
        appliedAt: new Date().toISOString()
      });
    }

    // Single database update with all changes
    const { error: updateError } = await supabaseClient
      .from('rundowns')
      .update({
        items: currentRundown.items,
        title: currentRundown.title,
        start_time: currentRundown.start_time,
        timezone: currentRundown.timezone,
        show_date: currentRundown.show_date,
        external_notes: currentRundown.external_notes,
        updated_at: new Date().toISOString(),
        last_updated_by: userData.user.id
      })
      .eq('id', batchRequest.rundownId);

    if (updateError) {
      throw new Error('Failed to update rundown');
    }

    console.log('✅ BATCH APPLIED:', {
      rundownId: batchRequest.rundownId,
      operationCount: appliedOperations.length
    });

    // Broadcast all applied operations for real-time sync
    try {
      const channel = supabaseClient.channel(`rundown-operations-${batchRequest.rundownId}`);
      
      for (const operation of appliedOperations) {
        await channel.send({
          type: 'broadcast',
          event: 'operation',
          payload: {
            type: 'operation_applied',
            operation,
            rundownId: batchRequest.rundownId
          }
        });
        console.log('📤 BROADCASTED OPERATION:', operation.operationType);
      }
    } catch (broadcastError) {
      console.error('❌ BROADCAST ERROR:', broadcastError);
      // Don't fail the whole operation if broadcast fails
    }

    // Return success response
    const response = {
      success: true,
      appliedOperations: appliedOperations.length,
      timestamp: new Date().toISOString()
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