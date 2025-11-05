import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StructuralOperation {
  rundownId: string;
  operationType: 'add_row' | 'delete_row' | 'move_rows' | 'copy_rows' | 'reorder' | 'add_header' | 'toggle_lock';
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

    // Accept either single operation or array of operations
    const operations: StructuralOperation[] = Array.isArray(body) ? body : [body];
    console.log('🏗️ Processing batch of structural operations:', {
      count: operations.length,
      rundownId: operations[0]?.rundownId,
      types: operations.map(op => op.operationType),
      userId: operations[0]?.userId
    });

    if (operations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No operations provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All operations should be for the same rundown
    const rundownId = operations[0].rundownId;
    const userId = operations[0].userId;
    const lockId = parseInt(rundownId.replace(/-/g, '').substring(0, 8), 16);
    
    // Get the current rundown with coordination timing
    console.log('🔒 Acquiring coordination lock for rundown:', rundownId);
    const { data: currentRundown, error: fetchError } = await supabase
      .from('rundowns')
      .select('*')
      .eq('id', rundownId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching rundown:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch rundown', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!currentRundown) {
      console.error('❌ Rundown not found:', rundownId);
      return new Response(
        JSON.stringify({ error: 'Rundown not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updatedItems = [...(currentRundown.items || [])];
    const actionDescriptions: string[] = [];
    let finalLockedRowNumbers = currentRundown.locked_row_numbers;
    let finalNumberingLocked = currentRundown.numbering_locked;

    // Process all operations sequentially
    for (const operation of operations) {
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

      case 'toggle_lock':
        // Lock state changes don't modify items, only update lock fields
        actionDescription = operation.operationData.numberingLocked 
          ? `Locked row numbering (${Object.keys(operation.operationData.lockedRowNumbers || {}).length} rows)` 
          : 'Unlocked row numbering';
        console.log(`🔒 ${actionDescription}`);
        break;

      default:
        console.warn('🚨 Unknown operation type:', operation.operationType);
        return new Response(
          JSON.stringify({ error: 'Unknown operation type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Track lock state changes from this operation
      if (operation.operationData.lockedRowNumbers !== undefined) {
        finalLockedRowNumbers = operation.operationData.lockedRowNumbers;
      }
      if (operation.operationData.numberingLocked !== undefined) {
        finalNumberingLocked = operation.operationData.numberingLocked;
      }

      actionDescriptions.push(actionDescription);
    }

    // SIMPLIFIED: No doc_version logic - just save directly (last write wins)
    
    // Update the rundown with all changes from the batch
    const updateData: any = {
      items: updatedItems,
      updated_at: new Date().toISOString(),
      last_updated_by: userId
    };
    
    // Include final locked row numbers if changed
    if (finalLockedRowNumbers !== currentRundown.locked_row_numbers) {
      updateData.locked_row_numbers = finalLockedRowNumbers;
      console.log('🔒 Saving locked row numbers:', Object.keys(finalLockedRowNumbers || {}).length);
    }
    
    // Include final numbering locked state if changed
    if (finalNumberingLocked !== currentRundown.numbering_locked) {
      updateData.numbering_locked = finalNumberingLocked;
      console.log('🔒 Saving numbering locked state:', finalNumberingLocked);
    }
    
    const { data: updatedRundown, error: updateError } = await supabase
      .from('rundowns')
      .update(updateData)
      .eq('id', rundownId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating rundown:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update rundown', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log all operations with enhanced coordination data
    const operationLogs = operations.map((operation, index) => ({
      rundown_id: rundownId,
      user_id: userId,
      operation_type: `structural_${operation.operationType}`,
      operation_data: {
        action: actionDescriptions[index],
        itemCount: updatedItems.length,
        operationType: operation.operationType,
        timestamp: operation.timestamp,
        sequenceNumber: operation.operationData.sequenceNumber,
        coordinatedAt: new Date().toISOString(),
        lockId: lockId,
        batchIndex: index,
        batchSize: operations.length
      }
    }));

    await supabase
      .from('rundown_operations')
      .insert(operationLogs);

    console.log('✅ Batch of structural operations completed successfully:', {
      rundownId,
      operationCount: operations.length,
      types: operations.map(op => op.operationType),
      itemCount: updatedItems.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        updatedAt: updatedRundown.updated_at,
        itemCount: updatedItems.length,
        operationsProcessed: operations.length,
        operations: actionDescriptions
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