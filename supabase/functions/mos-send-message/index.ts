import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MOSMessage {
  mosID: string;
  ncsID: string;
  messageID: number;
  roID: string;
  roSlug: string;
  roElementAction?: {
    operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'MOVE';
    element_target?: {
      roElementID: string;
    };
    element_source?: {
      roElementID: string;
      fields: Record<string, string>;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const {
      teamId,
      rundownId,
      eventType,
      segmentId,
      segmentData,
    } = await req.json();

    console.log('📡 MOS message request:', { teamId, rundownId, eventType, segmentId });

    // Create service role client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get MOS integration settings
    const { data: mosIntegration, error: integrationError } = await supabase
      .from('team_mos_integrations')
      .select('*')
      .eq('team_id', teamId)
      .eq('enabled', true)
      .single();

    if (integrationError || !mosIntegration) {
      throw new Error('MOS integration not enabled for this team');
    }

    console.log('✅ MOS integration found:', {
      mosId: mosIntegration.mos_id,
      host: mosIntegration.xpression_host,
      port: mosIntegration.xpression_port,
    });

    // Get field mappings
    const { data: fieldMappings, error: mappingsError } = await supabase
      .from('team_mos_field_mappings')
      .select('*')
      .eq('team_id', teamId)
      .eq('mos_integration_id', mosIntegration.id)
      .order('field_order', { ascending: true });

    if (mappingsError) {
      throw new Error('Failed to fetch field mappings');
    }

    console.log('📋 Field mappings:', fieldMappings?.length || 0);

    // Map segment data to Xpression fields
    const fields: Record<string, string> = {};
    if (segmentData && fieldMappings) {
      for (const mapping of fieldMappings) {
        const value = segmentData[mapping.cuer_column_key];
        if (value !== undefined && value !== null) {
          fields[mapping.xpression_field_name] = String(value);
        }
      }
    }

    console.log('🔄 Mapped fields:', fields);

    // Build MOS message
    const mosMessage: MOSMessage = {
      mosID: mosIntegration.mos_id,
      ncsID: 'CUER',
      messageID: Date.now(),
      roID: rundownId,
      roSlug: rundownId,
    };

    // Add roElementAction based on event type
    if (eventType === 'UPDATE' || eventType === 'MOVE') {
      mosMessage.roElementAction = {
        operation: eventType,
        element_target: {
          roElementID: segmentId,
        },
        element_source: {
          roElementID: segmentId,
          fields: fields,
        },
      };
    }

    console.log('📦 MOS message:', JSON.stringify(mosMessage, null, 2));

    // Send to Xpression via TCP
    let status = 'sent';
    let errorMessage: string | null = null;

    try {
      if (mosIntegration.xpression_host && mosIntegration.xpression_port) {
        // Convert MOS message to XML
        const xmlMessage = mosMessageToXML(mosMessage);
        
        // Send via TCP
        const conn = await Deno.connect({
          hostname: mosIntegration.xpression_host,
          port: mosIntegration.xpression_port,
        });

        const encoder = new TextEncoder();
        await conn.write(encoder.encode(xmlMessage));
        conn.close();

        console.log('✅ MOS message sent to Xpression');

        // Update connection status
        await supabase
          .from('mos_connection_status')
          .upsert({
            team_id: teamId,
            connected: true,
            last_heartbeat: new Date().toISOString(),
            xpression_host: mosIntegration.xpression_host,
            error_message: null,
          });
      } else {
        throw new Error('Xpression host or port not configured');
      }
    } catch (error) {
      console.error('❌ Failed to send MOS message:', error);
      status = 'failed';
      errorMessage = error.message;

      // Update connection status
      await supabase
        .from('mos_connection_status')
        .upsert({
          team_id: teamId,
          connected: false,
          last_heartbeat: new Date().toISOString(),
          xpression_host: mosIntegration.xpression_host,
          error_message: errorMessage,
        });
    }

    // Log the message
    await supabase.from('mos_message_log').insert({
      team_id: teamId,
      rundown_id: rundownId,
      event_type: eventType,
      message_payload: mosMessage,
      status: status,
      error_message: errorMessage,
    });

    return new Response(
      JSON.stringify({ success: status === 'sent', message: mosMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in mos-send-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function mosMessageToXML(message: MOSMessage): string {
  const { mosID, ncsID, messageID, roID, roSlug, roElementAction } = message;
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<mos>
  <mosID>${mosID}</mosID>
  <ncsID>${ncsID}</ncsID>
  <messageID>${messageID}</messageID>
`;

  if (roElementAction) {
    xml += `  <roElementAction operation="${roElementAction.operation}">
    <roID>${roID}</roID>
    <roSlug>${roSlug}</roSlug>
`;

    if (roElementAction.element_target) {
      xml += `    <element_target>
      <roElementID>${roElementAction.element_target.roElementID}</roElementID>
    </element_target>
`;
    }

    if (roElementAction.element_source) {
      xml += `    <element_source>
      <roElementID>${roElementAction.element_source.roElementID}</roElementID>
`;
      
      for (const [key, value] of Object.entries(roElementAction.element_source.fields)) {
        xml += `      <${key}>${escapeXML(value)}</${key}>
`;
      }
      
      xml += `    </element_source>
`;
    }

    xml += `  </roElementAction>
`;
  }

  xml += `</mos>`;
  
  return xml;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
