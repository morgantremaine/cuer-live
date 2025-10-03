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

    const body = await req.json()
    
    // Check for pre-warming request
    if (body.prewarm === true) {
      console.log('🔥 Pre-warming request received - responding immediately');
      return new Response(
        JSON.stringify({ success: true, prewarmed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { rundownId, fieldUpdates, contentSignature }: CellSaveRequest = body

    if (!rundownId || !fieldUpdates || !Array.isArray(fieldUpdates)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: missing rundownId or fieldUpdates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current rundown
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

    // Apply field updates
    const updatedItems = [...(currentRundown.items || [])]
    let updatedTitle = currentRundown.title
    let updatedStartTime = currentRundown.start_time
    let updatedTimezone = currentRundown.timezone
    let updatedShowDate = currentRundown.show_date
    let updatedExternalNotes = currentRundown.external_notes
    
    for (const update of fieldUpdates) {
      if (update.itemId) {
        const itemIndex = updatedItems.findIndex(item => item.id === update.itemId)
        if (itemIndex >= 0) {
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            [update.field]: update.value
          }
        }
      } else {
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
            if (update.value) {
              const dateObj = typeof update.value === 'string' ? new Date(update.value) : update.value;
              updatedShowDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            } else {
              updatedShowDate = null;
            }
            break
          case 'externalNotes':
            updatedExternalNotes = update.value
            break
        }
      }
    }

    const updateTimestamp = new Date().toISOString()
    const updateData = {
      items: updatedItems,
      title: updatedTitle,
      start_time: updatedStartTime,
      timezone: updatedTimezone,
      show_date: updatedShowDate,
      external_notes: updatedExternalNotes,
      updated_at: updateTimestamp,
      last_updated_by: user.id
    }

    const { data: updatedRundown, error: updateError } = await supabaseClient
      .from('rundowns')
      .update(updateData)
      .eq('id', rundownId)
      .select('updated_at')
      .single()

    if (updateError) {
      console.error('Cell save error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to save field updates', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        updatedAt: updatedRundown.updated_at,
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