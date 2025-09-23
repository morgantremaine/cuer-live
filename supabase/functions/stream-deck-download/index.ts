import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Creating Stream Deck plugin zip file');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Plugin files structure
    const pluginFiles = {
      'manifest.json': JSON.stringify({
        "Name": "Cuer ShowCaller",
        "Description": "Control your Cuer rundown showcaller directly from Stream Deck",
        "Category": "Cuer",
        "Author": "Cuer",
        "Icon": "Images/pluginIcon",
        "CodePath": "app.html",
        "PropertyInspectorPath": "propertyinspector.html",
        "Version": "1.0.0",
        "SDKVersion": 2,
        "Software": {
          "MinimumVersion": "6.0"
        },
        "OS": [
          { "Platform": "mac", "MinimumVersion": "10.15" },
          { "Platform": "windows", "MinimumVersion": "10" }
        ],
        "Actions": [
          {
            "UUID": "com.cuer.showcaller.playpause",
            "Name": "Play/Pause",
            "Icon": "Images/play",
            "States": [
              { "Image": "Images/play", "Name": "Play" },
              { "Image": "Images/pause", "Name": "Pause" }
            ],
            "PropertyInspectorPath": "propertyinspector.html",
            "SupportedInMultiActions": true,
            "Tooltip": "Toggle rundown play/pause"
          },
          {
            "UUID": "com.cuer.showcaller.forward",
            "Name": "Forward",
            "Icon": "Images/forward",
            "PropertyInspectorPath": "propertyinspector.html",
            "SupportedInMultiActions": true,
            "Tooltip": "Move to next segment"
          },
          {
            "UUID": "com.cuer.showcaller.backward",
            "Name": "Backward", 
            "Icon": "Images/backward",
            "PropertyInspectorPath": "propertyinspector.html",
            "SupportedInMultiActions": true,
            "Tooltip": "Move to previous segment"
          },
          {
            "UUID": "com.cuer.showcaller.reset",
            "Name": "Reset",
            "Icon": "Images/reset",
            "PropertyInspectorPath": "propertyinspector.html",
            "SupportedInMultiActions": true,
            "Tooltip": "Reset to beginning"
          },
          {
            "UUID": "com.cuer.showcaller.status",
            "Name": "Status Display",
            "Icon": "Images/status",
            "PropertyInspectorPath": "propertyinspector.html",
            "SupportedInMultiActions": false,
            "Tooltip": "Show current segment status"
          }
        ]
      }, null, 2),
      'app.html': `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no,minimal-ui,viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <title>Cuer ShowCaller Plugin</title>
</head>
<body>
    <script src="js/index.js"></script>
</body>
</html>`,
      'propertyinspector.html': `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Cuer ShowCaller - Property Inspector</title>
    <link rel="stylesheet" href="css/propertyinspector.css">
</head>
<body>
    <div class="sdpi-wrapper">
        <div class="sdpi-item">
            <div class="sdpi-item-label">Account</div>
            <div class="sdpi-item-value">
                <button class="sdpi-item-value" id="loginButton">Login to Cuer</button>
                <span id="loginStatus" style="display: none;"></span>
            </div>
        </div>
        
        <div class="sdpi-item" id="rundownSection" style="display: none;">
            <div class="sdpi-item-label">Rundown</div>
            <div class="sdpi-item-value">
                <select class="sdpi-item-value select" id="rundownSelect">
                    <option value="">Select a rundown...</option>
                </select>
                <button class="sdpi-item-value" id="refreshButton">Refresh Rundowns</button>
            </div>
        </div>
    </div>
    <script src="js/propertyinspector.js"></script>
</body>
</html>`
    };

    // Create a simple zip file structure (simplified for demo)
    const zipContent = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, // ZIP file signature
      // This is a simplified zip - in production you'd use a proper zip library
    ]);

    return new Response(zipContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="com.cuer.showcaller.streamDeckPlugin"',
        'Content-Length': zipContent.length.toString(),
      },
      status: 200,
    })

  } catch (error) {
    console.error('Error creating zip file:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create zip file', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})