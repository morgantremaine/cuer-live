import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Map camelCase field names to snake_case database columns
const CAMEL_TO_SNAKE_FIELD_MAP: Record<string, string> = {
  showDate: 'show_date',
  startTime: 'start_time',
  endTime: 'end_time',
  externalNotes: 'external_notes',
  numberingLocked: 'numbering_locked',
  lockedRowNumbers: 'locked_row_numbers'
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
  // REMOVED: baselineDocVersion - not used in last-write-wins architecture
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

    const requestStartTime = Date.now();
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
    
    console.log('📥 Cell save request received:', {
      rundownId,
      fieldUpdateCount: fieldUpdates.length,
      userId: user.id
    })

    if (!rundownId || !fieldUpdates || !Array.isArray(fieldUpdates)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: missing rundownId or fieldUpdates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current rundown
    const fetchStartTime = Date.now();
    console.log('🔍 Fetching current rundown from database...');
    
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
    
    const fetchDuration = Date.now() - fetchStartTime;
    console.log('✅ Rundown fetched:', {
      fetchDuration: `${fetchDuration}ms`,
      itemCount: currentRundown.items?.length || 0,
      currentDocVersion: currentRundown.doc_version
    })

    // REMOVED: Doc version conflict detection
    // Per-cell save system uses "last write wins" architecture
    // No doc_version checking - aligns with original per-cell design

    // Normalize values for comparison (null, undefined, empty string → null)
    const normalizeValue = (v: any): any => {
      if (v === null || v === undefined || v === '') return null;
      return v;
    };

    // Apply field updates
    console.log('⚙️ Processing field updates:', {
      updates: fieldUpdates.map(u => ({
        itemId: u.itemId || 'rundown-level',
        field: u.field,
        valueLength: typeof u.value === 'string' ? u.value.length : 'non-string'
      }))
    });
    
    const updatedItems = [...(currentRundown.items || [])]
    let updatedTitle = currentRundown.title
    let updatedStartTime = currentRundown.start_time
    let updatedEndTime = currentRundown.end_time
    let updatedTimezone = currentRundown.timezone
    let updatedShowDate = currentRundown.show_date
    let updatedExternalNotes = currentRundown.external_notes
    let updatedNumberingLocked = currentRundown.numbering_locked
    let updatedLockedRowNumbers = currentRundown.locked_row_numbers
    let hasActualChanges = false;
    
    for (const update of fieldUpdates) {
      if (update.itemId) {
        const itemIndex = updatedItems.findIndex(item => item.id === update.itemId)
        if (itemIndex >= 0) {
          // Handle custom fields with nested structure
          if (update.field.startsWith('customFields.')) {
            const customFieldKey = update.field.replace('customFields.', '')
            const oldValue = updatedItems[itemIndex].customFields?.[customFieldKey];
            if (normalizeValue(oldValue) !== normalizeValue(update.value)) {
              hasActualChanges = true;
              updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                customFields: {
                  ...(updatedItems[itemIndex].customFields || {}),
                  [customFieldKey]: update.value
                }
              }
            }
          } else {
            // Regular field update
            const oldValue = updatedItems[itemIndex][update.field];
            if (normalizeValue(oldValue) !== normalizeValue(update.value)) {
              hasActualChanges = true;
              updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                [update.field]: update.value
              }
            }
          }
        }
      } else {
        switch (update.field) {
          case 'title':
            if (normalizeValue(updatedTitle) !== normalizeValue(update.value)) {
              hasActualChanges = true;
              updatedTitle = update.value
            }
            break
          case 'startTime':
            if (normalizeValue(updatedStartTime) !== normalizeValue(update.value)) {
              hasActualChanges = true;
              updatedStartTime = update.value
            }
            break
          case 'endTime':
            if (normalizeValue(updatedEndTime) !== normalizeValue(update.value)) {
              hasActualChanges = true;
              updatedEndTime = update.value
            }
            break
          case 'timezone':
            if (normalizeValue(updatedTimezone) !== normalizeValue(update.value)) {
              hasActualChanges = true;
              updatedTimezone = update.value
            }
            break
          case 'showDate':
            if (update.value) {
              const dateObj = typeof update.value === 'string' ? new Date(update.value) : update.value;
              const newShowDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
              if (normalizeValue(updatedShowDate) !== normalizeValue(newShowDate)) {
                hasActualChanges = true;
                updatedShowDate = newShowDate;
              }
            } else {
              if (normalizeValue(updatedShowDate) !== null) {
                hasActualChanges = true;
                updatedShowDate = null;
              }
            }
            break
          case 'externalNotes':
            if (normalizeValue(updatedExternalNotes) !== normalizeValue(update.value)) {
              hasActualChanges = true;
              updatedExternalNotes = update.value
            }
            break
          case 'numberingLocked':
            if (normalizeValue(updatedNumberingLocked) !== normalizeValue(update.value)) {
              hasActualChanges = true;
              updatedNumberingLocked = update.value
              console.log('🔒 Updating numbering_locked:', update.value);
            }
            break
          case 'lockedRowNumbers':
            if (normalizeValue(updatedLockedRowNumbers) !== normalizeValue(update.value)) {
              hasActualChanges = true;
              updatedLockedRowNumbers = update.value
              console.log('🔒 Updating locked_row_numbers:', Object.keys(update.value || {}).length, 'items');
            }
            break
        }
      }
    }

    // Skip database update if nothing actually changed
    if (!hasActualChanges) {
      console.log('⏭️ No actual changes detected - skipping database update');
      return new Response(
        JSON.stringify({ success: true, noChanges: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updateTimestamp = new Date().toISOString()
    const newDocVersion = (currentRundown.doc_version || 0) + 1
    const updateData = {
      items: updatedItems,
      title: updatedTitle,
      start_time: updatedStartTime,
      end_time: updatedEndTime,
      timezone: updatedTimezone,
      show_date: updatedShowDate,
      external_notes: updatedExternalNotes,
      numbering_locked: updatedNumberingLocked,
      locked_row_numbers: updatedLockedRowNumbers,
      updated_at: updateTimestamp,
      last_updated_by: user.id,
      doc_version: newDocVersion
    }

    const updateStartTime = Date.now();
    console.log('💾 Writing updates to database...', { newDocVersion });
    
    const { data: updatedRundown, error: updateError } = await supabaseClient
      .from('rundowns')
      .update(updateData)
      .eq('id', rundownId)
      .select('updated_at, doc_version')
      .single()

    if (updateError) {
      const errorDuration = Date.now() - requestStartTime;
      console.error('❌ Cell save failed:', {
        error: updateError.message,
        duration: `${errorDuration}ms`,
        rundownId,
        fieldCount: fieldUpdates.length
      });
      return new Response(
        JSON.stringify({ error: 'Failed to save field updates', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const updateDuration = Date.now() - updateStartTime;
    const totalDuration = Date.now() - requestStartTime;
    console.log('✅ Cell save completed successfully:', {
      updateDuration: `${updateDuration}ms`,
      totalDuration: `${totalDuration}ms`,
      fieldsUpdated: fieldUpdates.length,
      updatedAt: updatedRundown.updated_at,
      docVersion: updatedRundown.doc_version
    })

    // Log cell edits to rundown_operations for history tracking
    try {
      const operationData = {
        fieldUpdates: fieldUpdates.map(u => {
          // Extract old value from current rundown
          let oldValue = null;
          if (u.itemId) {
            const item = currentRundown.items?.find((item: any) => item.id === u.itemId);
            if (item) {
              if (u.field.startsWith('customFields.')) {
                const customFieldKey = u.field.replace('customFields.', '');
                oldValue = item.customFields?.[customFieldKey] || null;
              } else {
                oldValue = item[u.field] || null;
              }
            }
          } else {
            // Rundown-level field - map camelCase to snake_case for DB lookup
            const dbField = CAMEL_TO_SNAKE_FIELD_MAP[u.field] || u.field;
            oldValue = currentRundown[dbField] || null;
          }
          
          return {
            itemId: u.itemId || null,
            field: u.field,
            oldValue: oldValue,
            newValue: u.value,
            timestamp: u.timestamp
          };
        })
      };

      // Filter out no-change updates before logging history
      const actualChanges = operationData.fieldUpdates.filter(u => 
        normalizeValue(u.oldValue) !== normalizeValue(u.newValue)
      );

      // Only insert history if there are actual changes
      if (actualChanges.length > 0) {
        await supabaseClient.from('rundown_operations').insert({
          rundown_id: rundownId,
          user_id: user.id,
          operation_type: 'cell_edit',
          operation_data: { fieldUpdates: actualChanges },
          created_at: new Date().toISOString()
        });
        console.log('📝 Logged cell edit operation to history');
      } else {
        console.log('⏭️ Skipped history - no actual changes detected');
      }
    } catch (historyError) {
      // Don't fail the save if history logging fails
      console.error('⚠️ Failed to log cell edit to history:', historyError);
    }

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