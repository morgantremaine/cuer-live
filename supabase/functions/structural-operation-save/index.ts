import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SortOrderUpdate {
  itemId: string;
  sortOrder: string;
}

interface StructuralOperation {
  rundownId: string;
  operationType: 'add_row' | 'delete_row' | 'move_rows' | 'copy_rows' | 'reorder' | 'add_header' | 'toggle_lock' | 'update_sort_order';
  operationData: {
    items?: any[];
    order?: string[];
    deletedIds?: string[];
    newItems?: any[];
    insertIndex?: number;
    sequenceNumber?: number;
    lockedRowNumbers?: { [itemId: string]: string };
    numberingLocked?: boolean;
    // For sortOrder updates
    sortOrderUpdates?: SortOrderUpdate[];
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

// Generate advisory lock ID from rundown ID
function getLockId(rundownId: string): number {
  // Use a hash of the rundown ID to get a consistent lock number
  let hash = 0;
  for (let i = 0; i < rundownId.length; i++) {
    const char = rundownId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
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
      numberingLocked: operation.operationData.numberingLocked,
      sortOrderUpdatesCount: operation.operationData.sortOrderUpdates?.length
    });

    // Use advisory lock to serialize operations per rundown
    const lockId = getLockId(operation.rundownId);
    let lockAcquired = false;
    let retryCount = 0;
    const maxRetries = 40;
    const retryDelayMs = 500;

    // Try to acquire advisory lock with retries
    while (!lockAcquired && retryCount < maxRetries) {
      const { data: lockResult, error: lockError } = await supabase
        .rpc('pg_try_advisory_lock', { lock_id: lockId });
      
      if (lockError) {
        console.error('❌ Lock error:', lockError);
        // Fall through without lock - better to attempt the operation
        break;
      }
      
      if (lockResult === true) {
        lockAcquired = true;
        console.log(`🔒 Advisory lock acquired for rundown (attempt ${retryCount + 1})`);
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    if (!lockAcquired && retryCount >= maxRetries) {
      console.warn('⚠️ Could not acquire advisory lock after max retries, proceeding anyway');
    }

    try {
      // Fetch current rundown from database
      const { data: rundown, error: fetchError } = await supabase
        .from('rundowns')
        .select('*')
        .eq('id', operation.rundownId)
        .single();

      if (fetchError) {
        console.error('❌ Failed to fetch rundown:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch rundown', details: fetchError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!rundown) {
        console.error('❌ Rundown not found:', operation.rundownId);
        return new Response(
          JSON.stringify({ error: 'Rundown not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

        case 'update_sort_order': {
          // Apply sortOrder updates to items - this is the critical path for reordering
          const sortOrderUpdates = operation.operationData.sortOrderUpdates || [];
          
          if (sortOrderUpdates.length === 0) {
            console.warn('⚠️ update_sort_order called with no updates');
            break;
          }
          
          // Create a map for quick lookup
          const sortOrderMap = new Map(sortOrderUpdates.map(u => [u.itemId, u.sortOrder]));
          
          // Update each item's sortOrder
          let updatedCount = 0;
          updatedItems = updatedItems.map(item => {
            const newSortOrder = sortOrderMap.get(item.id);
            if (newSortOrder !== undefined) {
              updatedCount++;
              return { ...item, sortOrder: newSortOrder };
            }
            return item;
          });
          
          actionDescription = `Updated sortOrder for ${updatedCount} item(s)`;
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
    } finally {
      // Always release the advisory lock if we acquired it
      if (lockAcquired) {
        try {
          await supabase.rpc('pg_advisory_unlock', { lock_id: lockId });
          console.log('🔓 Advisory lock released');
        } catch (unlockError) {
          console.error('⚠️ Failed to release advisory lock:', unlockError);
        }
      }
    }

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
