import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MOSMessageRequest {
  messageType: 'roCreate' | 'roElementAction' | 'roStorySend' | 'roReadyToAir' | 'roStoryTake';
  teamId: string;
  rundownId: string;
  payload: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { messageType, teamId, rundownId, payload } = await req.json() as MOSMessageRequest;

    // Fetch MOS integration settings
    const { data: integration, error: integrationError } = await supabase
      .from('team_mos_integrations')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (integrationError || !integration) {
      throw new Error('MOS integration not found or not enabled');
    }

    if (!integration.enabled) {
      throw new Error('MOS integration is disabled');
    }

    // Fetch field mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from('team_mos_field_mappings')
      .select('*')
      .eq('team_id', teamId)
      .order('field_order');

    if (mappingsError) {
      throw new Error('Failed to fetch field mappings');
    }

    // Build MOS XML message
    let xmlMessage = '';
    
    switch (messageType) {
      case 'roCreate':
        xmlMessage = buildRoCreateMessage(integration.mos_id, rundownId, payload, mappings || []);
        break;
      case 'roElementAction':
        xmlMessage = buildRoElementActionMessage(integration.mos_id, rundownId, payload, mappings || []);
        break;
      case 'roStorySend':
        xmlMessage = buildRoStorySendMessage(integration.mos_id, rundownId, payload, mappings || []);
        break;
      case 'roReadyToAir':
        xmlMessage = buildRoReadyToAirMessage(integration.mos_id, rundownId, payload);
        break;
      case 'roStoryTake':
        xmlMessage = buildRoStoryTakeMessage(integration.mos_id, rundownId, payload);
        break;
    }

    // Log the message
    await supabase.from('mos_message_log').insert({
      team_id: teamId,
      rundown_id: rundownId,
      message_type: messageType,
      message_payload: { xml: xmlMessage, ...payload },
      status: 'sent',
    });

    // In a real implementation, this would send to XPression via TCP
    // For now, we're just logging and returning success
    console.log('MOS Message:', xmlMessage);

    return new Response(
      JSON.stringify({ success: true, message: xmlMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('MOS send error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildMosPayload(item: any, mappings: any[]): string {
  let payload = '<mosPayload>\n';
  
  for (const mapping of mappings) {
    const value = item[mapping.cuer_column_key] || '';
    payload += `      <${mapping.xpression_field_name}>${escapeXml(value)}</${mapping.xpression_field_name}>\n`;
  }
  
  payload += '    </mosPayload>';
  return payload;
}

function buildRoCreateMessage(mosId: string, rundownId: string, payload: any, mappings: any[]): string {
  const { title, items } = payload;
  
  let storiesXml = '';
  for (const item of items) {
    if (item.isFloating) continue; // Skip floating items
    
    storiesXml += `    <story>
      <storyID>${item.id}</storyID>
      <storySlug>${escapeXml(item.name)}</storySlug>
      <mosExternalMetadata>
        <mosSchema>ross.xpression</mosSchema>
        ${buildMosPayload(item, mappings)}
      </mosExternalMetadata>
    </story>
`;
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<mos>
  <ncsID>${mosId}</ncsID>
  <roCreate>
    <roID>${rundownId}</roID>
    <roSlug>${escapeXml(title)}</roSlug>
${storiesXml}  </roCreate>
</mos>`;
}

function buildRoElementActionMessage(mosId: string, rundownId: string, payload: any, mappings: any[]): string {
  const { operation, item, targetItemId } = payload;
  
  let actionXml = '';
  
  if (operation === 'INSERT' || operation === 'REPLACE') {
    actionXml = `    <element_source>
      <story>
        <storyID>${item.id}</storyID>
        <storySlug>${escapeXml(item.name)}</storySlug>
        <mosExternalMetadata>
          <mosSchema>ross.xpression</mosSchema>
          ${buildMosPayload(item, mappings)}
        </mosExternalMetadata>
      </story>
    </element_source>`;
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<mos>
  <ncsID>${mosId}</ncsID>
  <roElementAction operation="${operation}">
    <roID>${rundownId}</roID>
    ${targetItemId ? `<element_target><storyID>${targetItemId}</storyID></element_target>` : ''}
${actionXml}
  </roElementAction>
</mos>`;
}

function buildRoStorySendMessage(mosId: string, rundownId: string, payload: any, mappings: any[]): string {
  const { item } = payload;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<mos>
  <ncsID>${mosId}</ncsID>
  <roStorySend>
    <roID>${rundownId}</roID>
    <storyID>${item.id}</storyID>
    <mosExternalMetadata>
      <mosSchema>ross.xpression</mosSchema>
      ${buildMosPayload(item, mappings)}
    </mosExternalMetadata>
  </roStorySend>
</mos>`;
}

function buildRoReadyToAirMessage(mosId: string, rundownId: string, payload: any): string {
  const { itemId } = payload;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<mos>
  <ncsID>${mosId}</ncsID>
  <roReadyToAir>
    <roID>${rundownId}</roID>
    <storyID>${itemId}</storyID>
  </roReadyToAir>
</mos>`;
}

function buildRoStoryTakeMessage(mosId: string, rundownId: string, payload: any): string {
  const { itemId } = payload;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<mos>
  <ncsID>${mosId}</ncsID>
  <roStoryTake>
    <roID>${rundownId}</roID>
    <storyID>${itemId}</storyID>
  </roStoryTake>
</mos>`;
}
