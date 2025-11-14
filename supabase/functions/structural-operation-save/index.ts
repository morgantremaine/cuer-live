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

    // PHASE 1: Fetch current state (BEFORE acquiring lock - no exclusive access needed)
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

    const fetchTime = Date.now();
    console.log(`⏱️ Fetch completed in ${fetchTime - startTime}ms`);

    // PHASE 2: Acquire advisory lock for rundown (ONLY for the critical update section)
    const lockId = parseInt(operation.rundownId.replace(/-/g, '').substring(0, 15), 16);
    
    console.log('🔒 Attempting to acquire advisory lock for rundown:', operation.rundownId, 'lockId:', lockId);
    
    // Try to acquire lock with retries (max 20 seconds)
    let lockAcquired = false;
    const maxRetries = 40; // 40 attempts * 500ms = 20 seconds max wait
    let retryCount = 0;

    while (!lockAcquired && retryCount < maxRetries) {
      const { data: acquired, error: lockError } = await supabase.rpc('pg_try_advisory_lock', { key: lockId });
      
      if (lockError) {
        console.error('❌ Error checking advisory lock:', lockError);
        return new Response(
          JSON.stringify({ error: 'Failed to check lock', details: lockError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (acquired) {
        lockAcquired = true;
        console.log(`✅ Advisory lock acquired (attempt ${retryCount + 1})`);
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`⏳ Lock held by another operation, waiting... (attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
        }
      }
    }

    if (!lockAcquired) {
      console.error('❌ Failed to acquire advisory lock after 20 seconds');
      return new Response(
        JSON.stringify({ error: 'Lock acquisition timeout', details: 'Another operation is taking too long' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const lockTime = Date.now();
    console.log(`⏱️ Lock acquired in ${lockTime - fetchTime}ms (total: ${lockTime - startTime}ms)`);
    
    // PHASE 3: Process the operation (with lock held)
    let updatedItems = [...(currentRundown.items || [])];
    let actionDescription = '';
    let updateTime = lockTime;
    
    try {

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

      // PHASE 4: Update database (critical section - lock is held here)
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

      updateTime = Date.now();
      console.log(`⏱️ Database update completed in ${updateTime - lockTime}ms`);

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
      // PHASE 5: Release lock and log operation (AFTER lock release - doesn't need exclusive access)
      console.log('🔓 Releasing advisory lock');
      await supabase.rpc('pg_advisory_unlock', { key: lockId });
      
      const releaseTime = Date.now();
      
      // Log the operation (fire and forget - don't wait for this)
      supabase
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
        })
        .then(() => console.log('📝 Operation logged'))
        .catch(err => console.error('⚠️ Failed to log operation (non-critical):', err));
      
      console.log('⏱️ Operation timing breakdown:', {
        operationType: operation.operationType,
        fetchMs: fetchTime - startTime,
        lockWaitMs: lockTime - fetchTime,
        updateMs: updateTime - lockTime,
        releaseMs: releaseTime - updateTime,
        totalMs: releaseTime - startTime
      });
      
      console.log('✅ Structural operation completed successfully:', {
        rundownId: operation.rundownId,
        operationType: operation.operationType,
        itemCount: updatedItems.length
      });
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