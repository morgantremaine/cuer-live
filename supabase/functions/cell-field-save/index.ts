import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FieldUpdate {
  itemId?: string;
  field: string;
  value: any;
  timestamp: number;
}

interface CellSaveRequest {
  rundownId: string;
  fieldUpdates: FieldUpdate[];
  expectedSignature?: string;
  contentSignature: string;
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
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { rundownId, fieldUpdates, contentSignature }: CellSaveRequest = await req.json()

    if (!rundownId || !fieldUpdates || !Array.isArray(fieldUpdates)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: missing rundownId or fieldUpdates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🧪 EDGE FUNCTION: Cell-level save request received:', {
      rundownId,
      fieldUpdateCount: fieldUpdates.length,
      fields: fieldUpdates.map(u => ({ 
        itemId: u.itemId, 
        field: u.field, 
        valueType: typeof u.value,
        valueLength: typeof u.value === 'string' ? u.value.length : 'N/A'
      })),
      userId: user.id,
      contentSignature
    })

    // Get current rundown state with locking for consistency
    const { data: currentRundown, error: fetchError } = await supabaseClient
      .from('rundowns')
      .select('*')
      .eq('id', rundownId)
      .single()

    if (fetchError || !currentRundown) {
      return new Response(
        JSON.stringify({ error: 'Rundown not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if per-cell save is enabled
    console.log('🧪 EDGE FUNCTION: Checking per-cell save status:', {
      per_cell_save_enabled: currentRundown.per_cell_save_enabled,
      rundownTitle: currentRundown.title
    });
    
    if (!currentRundown.per_cell_save_enabled) {
      console.log('🚨 EDGE FUNCTION: Per-cell save not enabled for rundown');
      return new Response(
        JSON.stringify({ error: 'Per-cell save not enabled for this rundown' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Apply field updates to current state
    const updatedItems = [...(currentRundown.items || [])]
    let updatedTitle = currentRundown.title
    let updatedStartTime = currentRundown.start_time
    let updatedTimezone = currentRundown.timezone
    let updatedShowDate = currentRundown.show_date
    let updatedExternalNotes = currentRundown.external_notes

    // Track field updates in the new JSONB column
    const itemFieldUpdates = currentRundown.item_field_updates || {}
    const updateTimestamp = new Date().toISOString()

    console.log('🧪 EDGE FUNCTION: Processing field updates...');
    
    for (const update of fieldUpdates) {
      console.log('🧪 EDGE FUNCTION: Processing update:', {
        itemId: update.itemId,
        field: update.field,
        valueType: typeof update.value,
        timestamp: update.timestamp
      });
      
      if (update.itemId) {
        // Item field update
        const itemIndex = updatedItems.findIndex(item => item.id === update.itemId)
        console.log('🧪 EDGE FUNCTION: Item field update:', {
          itemId: update.itemId,
          itemIndex,
          field: update.field,
          found: itemIndex >= 0
        });
        
        if (itemIndex >= 0) {
          // Update the item field
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            [update.field]: update.value
          }

          // Track in item_field_updates
          if (!itemFieldUpdates[update.itemId]) {
            itemFieldUpdates[update.itemId] = {}
          }
          itemFieldUpdates[update.itemId][update.field] = {
            value: update.value,
            timestamp: updateTimestamp,
            userId: user.id
          }
          console.log('🧪 EDGE FUNCTION: Item field updated and tracked');
        }
      } else {
        // Global field update
        console.log('🧪 EDGE FUNCTION: Global field update:', {
          field: update.field,
          valueType: typeof update.value
        });
        
        switch (update.field) {
          case 'title':
            updatedTitle = update.value
            break
          case 'startTime':
            updatedStartTime = update.value
            break
          case 'timezone':
            updatedTimezone = update.value
            break
          case 'showDate':
            updatedShowDate = update.value ? `${update.value.getFullYear()}-${String(update.value.getMonth() + 1).padStart(2, '0')}-${String(update.value.getDate()).padStart(2, '0')}` : null
            break
          case 'externalNotes':
            updatedExternalNotes = update.value
            break
        }
      }
    }
    
    console.log('🧪 EDGE FUNCTION: All updates processed, preparing database save...');

    // Build update data - NO doc_version conflicts!
    const updateData = {
      items: updatedItems,
      title: updatedTitle,
      start_time: updatedStartTime,
      timezone: updatedTimezone,
      show_date: updatedShowDate,
      external_notes: updatedExternalNotes,
      item_field_updates: itemFieldUpdates,
      updated_at: updateTimestamp,
      last_updated_by: user.id
    }

    // Save without doc_version conflicts
    const { data: updatedRundown, error: updateError } = await supabaseClient
      .from('rundowns')
      .update(updateData)
      .eq('id', rundownId)
      .select('updated_at, doc_version')
      .single()

    if (updateError) {
      console.error('🚨 Cell save error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to save field updates', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ EDGE FUNCTION: Cell-level save successful:', {
      rundownId,
      updatedFields: fieldUpdates.length,
      updatedAt: updatedRundown.updated_at,
      docVersion: updatedRundown.doc_version,
      userId: user.id,
      itemFieldUpdatesCount: Object.keys(itemFieldUpdates).length
    })

    return new Response(
      JSON.stringify({
        success: true,
        updatedAt: updatedRundown.updated_at,
        docVersion: updatedRundown.doc_version,
        fieldsUpdated: fieldUpdates.length,
        contentSignature
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('🚨 Cell save function error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})