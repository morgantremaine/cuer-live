import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  tabId?: string;
}

// Renumber all items to maintain sequential numbering
function renumberItems(items: any[]): any[] {
  let headerIndex = 0;
  let regularItemIndex = 1;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  return items.map(item => {
    if (item.type === 'header') {
      const newHeaderLetter = letters[headerIndex] || 'A';
      headerIndex++;
      return {
        ...item,
        rowNumber: newHeaderLetter,
        segmentName: newHeaderLetter
      };
    } else {
      const newRowNumber = regularItemIndex.toString();
      regularItemIndex++;
      return {
        ...item,
        rowNumber: newRowNumber
      };
    }
  });
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
    // Get the authenticated user from the auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Authenticated user:', user.id);

    // Create service role client for database operations
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
    const startTime = Date.now();
    
    console.log('🏗️ Processing structural operation:', {
      rundownId: operation.rundownId,
      operationType: operation.operationType,
      userId: operation.userId,
      timestamp: operation.timestamp,
      hasLockedNumbers: !!operation.operationData.lockedRowNumbers,
      lockedNumbersCount: Object.keys(operation.operationData.lockedRowNumbers || {}).length,
      numberingLocked: operation.operationData.numberingLocked
    });

    // Lock and fetch rundown atomically using FOR UPDATE
    // Retry up to 20 times with 100ms delay (2 seconds max wait)
    let rundown = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const { data, error } = await supabase.rpc('lock_and_fetch_rundown', { 
        rundown_uuid: operation.rundownId 
      });
      
      if (error) {
        console.error(`⚠️ Lock attempt ${attempt + 1} error:`, error);
      } else if (data) {
        rundown = data;
        console.log(`🔒 Row lock acquired for rundown ${operation.rundownId} (attempt ${attempt + 1})`);
        break;
      }
      
      // Row is locked by another transaction, wait 100ms and retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!rundown) {
      console.error('❌ Could not acquire row lock after 20 attempts');
      return new Response(
        JSON.stringify({ error: 'Could not lock rundown - server busy, please retry' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply the operation to the items
    let updatedItems = [...(rundown.items as any[])];
    let actionDescription = '';
    let updatedLockedRowNumbers = rundown.locked_row_numbers ? { ...(rundown.locked_row_numbers as Record<string, string>) } : {};
    let updatedNumberingLocked = rundown.numbering_locked ?? false;

    switch (operation.operationType) {
      case 'add_row':
      case 'add_header': {
        const newItems = operation.operationData.newItems || [];
        const insertIndex = operation.operationData.insertIndex ?? updatedItems.length;
        
        updatedItems.splice(insertIndex, 0, ...newItems);
        
        // Renumber all items to maintain sequential numbering
        console.log('🔢 Renumbering items after add operation');
        updatedItems = renumberItems(updatedItems);
        
        actionDescription = `Added ${newItems.length} ${operation.operationType === 'add_header' ? 'header' : 'row'}(s) at index ${insertIndex}`;
        console.log(`✅ ${actionDescription}`);
        break;
      }

      case 'delete_row': {
        const deletedIds = operation.operationData.deletedIds || [];
        const beforeCount = updatedItems.length;
        updatedItems = updatedItems.filter(item => !deletedIds.includes(item.id));
        
        // Remove deleted items from locked row numbers
        deletedIds.forEach(id => {
          delete updatedLockedRowNumbers[id];
        });
        
        // Renumber all items to maintain sequential numbering
        console.log('🔢 Renumbering items after delete operation');
        updatedItems = renumberItems(updatedItems);
        
        actionDescription = `Deleted ${beforeCount - updatedItems.length} row(s)`;
        console.log(`✅ ${actionDescription}`);
        break;
      }

      case 'move_rows': {
        const items = operation.operationData.items || [];
        const insertIndex = operation.operationData.insertIndex ?? updatedItems.length;
        
        // Remove the items from their current positions
        const itemIds = items.map(item => item.id);
        updatedItems = updatedItems.filter(item => !itemIds.includes(item.id));
        
        // Insert items at the new position
        updatedItems.splice(insertIndex, 0, ...items);
        
        // Renumber all items to maintain sequential numbering
        console.log('🔢 Renumbering items after move operation');
        updatedItems = renumberItems(updatedItems);
        
        actionDescription = `Moved ${items.length} row(s) to index ${insertIndex}`;
        console.log(`✅ ${actionDescription}`);
        break;
      }

      case 'copy_rows': {
        const items = operation.operationData.items || [];
        const insertIndex = operation.operationData.insertIndex ?? updatedItems.length;
        
        // Insert copied items at the new position
        updatedItems.splice(insertIndex, 0, ...items);
        
        // Renumber all items to maintain sequential numbering
        console.log('🔢 Renumbering items after copy operation');
        updatedItems = renumberItems(updatedItems);
        
        actionDescription = `Copied ${items.length} row(s) to index ${insertIndex}`;
        console.log(`✅ ${actionDescription}`);
        break;
      }

      case 'reorder': {
        const newOrder = operation.operationData.order || [];
        
        // Reorder items based on the provided order
        const itemsMap = new Map(updatedItems.map(item => [item.id, item]));
        updatedItems = newOrder.map(id => itemsMap.get(id)).filter(Boolean) as any[];
        
        // Renumber all items to maintain sequential numbering
        console.log('🔢 Renumbering items after reorder operation');
        updatedItems = renumberItems(updatedItems);
        
        actionDescription = `Reordered ${updatedItems.length} items`;
        console.log(`✅ ${actionDescription}`);
        break;
      }

      case 'toggle_lock': {
        // Update the locked row numbers from the operation data
        if (operation.operationData.lockedRowNumbers !== undefined) {
          updatedLockedRowNumbers = operation.operationData.lockedRowNumbers;
        }
        if (operation.operationData.numberingLocked !== undefined) {
          updatedNumberingLocked = operation.operationData.numberingLocked;
        }
        
        const lockedCount = Object.keys(updatedLockedRowNumbers).length;
        actionDescription = `Updated row locks: ${lockedCount} locked rows, numbering ${updatedNumberingLocked ? 'locked' : 'unlocked'}`;
        console.log(`✅ ${actionDescription}`);
        break;
      }

      default:
        console.error('❌ Unknown operation type:', operation.operationType);
        return new Response(
          JSON.stringify({ error: 'Unknown operation type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Calculate new doc_version to trigger SharedRundown polling updates
    const newDocVersion = (rundown.doc_version || 0) + 1;

    // Update the rundown with the new items and lock state
    const { data: updatedRundown, error: updateError } = await supabase
      .from('rundowns')
      .update({
        items: updatedItems,
        locked_row_numbers: updatedLockedRowNumbers,
        numbering_locked: updatedNumberingLocked,
        updated_at: new Date().toISOString(),
        last_updated_by: user.id, // Use authenticated user
        tab_id: operation.tabId || null,
        doc_version: newDocVersion
      })
      .eq('id', operation.rundownId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update rundown:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update rundown', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the operation to rundown_operations table
    const { error: logError } = await supabase
      .from('rundown_operations')
      .insert({
        rundown_id: operation.rundownId,
        operation_type: operation.operationType,
        operation_data: operation.operationData,
        user_id: user.id, // Use authenticated user
        sequence_number: operation.operationData.sequenceNumber || 0,
        applied_at: new Date().toISOString()
      });

    if (logError) {
      console.error('⚠️ Failed to log operation (non-fatal):', logError);
    }

    console.log('📝 Operation logged successfully');

    const duration = Date.now() - startTime;
    console.log(`⏱️ Operation completed in ${duration}ms`);

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
