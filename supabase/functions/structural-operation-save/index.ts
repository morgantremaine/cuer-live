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

    const operation: StructuralOperation = await req.json();
    console.log('🏗️ Processing structural operation:', {
      rundownId: operation.rundownId,
      operationType: operation.operationType,
      userId: operation.userId,
      timestamp: operation.timestamp
    });

    // Get the current rundown
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

    // Update the rundown with the new items
    const { data: updatedRundown, error: updateError } = await supabase
      .from('rundowns')
      .update({
        items: updatedItems,
        updated_at: new Date().toISOString(),
        last_updated_by: operation.userId,
        doc_version: currentRundown.doc_version + 1
      })
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

    // Log the operation
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
          timestamp: operation.timestamp
        }
      });

    console.log('✅ Structural operation completed successfully:', {
      rundownId: operation.rundownId,
      operationType: operation.operationType,
      itemCount: updatedItems.length,
      docVersion: updatedRundown.doc_version
    });

    return new Response(
      JSON.stringify({
        success: true,
        docVersion: updatedRundown.doc_version,
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