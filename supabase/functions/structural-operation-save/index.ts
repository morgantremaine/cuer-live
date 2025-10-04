import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StructuralOperation {
  rundownId: string;
  operationType: 'add_row' | 'delete_row' | 'move_rows' | 'copy_rows' | 'reorder' | 'add_header';
  operationData: {
    items?: any[];
    order?: string[];
    deletedIds?: string[];
    newItems?: any[];
    insertIndex?: number;
    sequenceNumber?: number;
    lockedRowNumbers?: { [itemId: string]: string };
    numberingLocked?: boolean;
  };
  userId: string;
  timestamp: string;
}

serve(async (req) => {
  console.log('🏗️ Structural operation save function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    
    // Check for pre-warming request
    if (body.prewarm === true) {
      console.log('🔥 Pre-warming request received - responding immediately');
      return new Response(
        JSON.stringify({ success: true, prewarmed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const operation: StructuralOperation = body;
    console.log('🏗️ Processing structural operation:', {
      rundownId: operation.rundownId,
      operationType: operation.operationType,
      userId: operation.userId,
      timestamp: operation.timestamp
    });

    // Start coordination - acquire advisory lock for rundown
    const lockId = parseInt(operation.rundownId.replace(/-/g, '').substring(0, 8), 16);
    
    // Get the current rundown with coordination timing
    console.log('🔒 Acquiring coordination lock for rundown:', operation.rundownId);
    const { data: currentRundown, error: fetchError } = await supabase
      .from('rundowns')
      .select('*')
      .eq('id', operation.rundownId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching rundown:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch rundown', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!currentRundown) {
      console.error('❌ Rundown not found:', operation.rundownId);
      return new Response(
        JSON.stringify({ error: 'Rundown not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updatedItems = [...(currentRundown.items || [])];
    let actionDescription = '';

    // Apply the structural operation
    switch (operation.operationType) {
      case 'add_row':
      case 'add_header':
        if (operation.operationData.newItems && operation.operationData.insertIndex !== undefined) {
          const insertIndex = Math.max(0, Math.min(operation.operationData.insertIndex, updatedItems.length));
          updatedItems.splice(insertIndex, 0, ...operation.operationData.newItems);
          actionDescription = `Added ${operation.operationData.newItems.length} item(s)`;
          console.log(`🏗️ Added ${operation.operationData.newItems.length} items at index ${insertIndex}`);
        }
        break;

      case 'delete_row':
        if (operation.operationData.deletedIds) {
          const beforeCount = updatedItems.length;
          updatedItems = updatedItems.filter(item => !operation.operationData.deletedIds!.includes(item.id));
          const deletedCount = beforeCount - updatedItems.length;
          actionDescription = `Deleted ${deletedCount} item(s)`;
          console.log(`🏗️ Deleted ${deletedCount} items`);
        }
        break;

      case 'reorder':
      case 'move_rows':
        if (operation.operationData.order) {
          // Reorder items based on the provided order
          const orderMap = new Map(operation.operationData.order.map((id, index) => [id, index]));
          updatedItems.sort((a, b) => {
            const aIndex = orderMap.get(a.id) ?? 999999;
            const bIndex = orderMap.get(b.id) ?? 999999;
            return aIndex - bIndex;
          });
          actionDescription = 'Reordered items';
          console.log('🏗️ Reordered items based on provided order');
        }
        break;

      case 'copy_rows':
        if (operation.operationData.newItems && operation.operationData.insertIndex !== undefined) {
          const insertIndex = Math.max(0, Math.min(operation.operationData.insertIndex, updatedItems.length));
          updatedItems.splice(insertIndex, 0, ...operation.operationData.newItems);
          actionDescription = `Copied ${operation.operationData.newItems.length} item(s)`;
          console.log(`🏗️ Copied ${operation.operationData.newItems.length} items at index ${insertIndex}`);
        }
        break;

      default:
        console.warn('🚨 Unknown operation type:', operation.operationType);
        return new Response(
          JSON.stringify({ error: 'Unknown operation type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // SIMPLIFIED: No doc_version logic - just save directly (last write wins)
    
    // Update the rundown with the new items
    const updateData: any = {
      items: updatedItems,
      updated_at: new Date().toISOString(),
      last_updated_by: operation.userId
    };
    
    // Include locked row numbers if provided
    if (operation.operationData.lockedRowNumbers !== undefined) {
      updateData.locked_row_numbers = operation.operationData.lockedRowNumbers;
      console.log('🔒 Saving locked row numbers:', Object.keys(operation.operationData.lockedRowNumbers).length);
    }
    
    // Include numbering locked state if provided
    if (operation.operationData.numberingLocked !== undefined) {
      updateData.numbering_locked = operation.operationData.numberingLocked;
      console.log('🔒 Saving numbering locked state:', operation.operationData.numberingLocked);
    }
    
    const { data: updatedRundown, error: updateError } = await supabase
      .from('rundowns')
      .update(updateData)
      .eq('id', operation.rundownId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating rundown:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update rundown', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the operation with enhanced coordination data
    await supabase
      .from('rundown_operations')
      .insert({
        rundown_id: operation.rundownId,
        user_id: operation.userId,
        operation_type: `structural_${operation.operationType}`,
        operation_data: {
          action: actionDescription,
          itemCount: updatedItems.length,
          operationType: operation.operationType,
          timestamp: operation.timestamp,
          sequenceNumber: operation.operationData.sequenceNumber,
          coordinatedAt: new Date().toISOString(),
          lockId: lockId
        }
      });

    console.log('✅ Structural operation completed successfully:', {
      rundownId: operation.rundownId,
      operationType: operation.operationType,
      itemCount: updatedItems.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        updatedAt: updatedRundown.updated_at,
        itemCount: updatedItems.length,
        operation: actionDescription
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Structural operation save error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});