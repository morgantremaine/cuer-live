import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Simple ZIP file creation utilities
function crc32(data: Uint8Array): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createZipFile(files: Record<string, string | Uint8Array>): Uint8Array {
  const encoder = new TextEncoder();
  const fileEntries: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const [filename, content] of Object.entries(files)) {
    const filenameBytes = encoder.encode(filename);
    const contentBytes = typeof content === 'string' ? encoder.encode(content) : content;
    const crc = crc32(contentBytes);

    // Local file header
    const localHeader = new Uint8Array(30 + filenameBytes.length);
    const view = new DataView(localHeader.buffer);
    
    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed to extract
    view.setUint16(6, 0, true); // General purpose bit flag
    view.setUint16(8, 0, true); // Compression method (no compression)
    view.setUint16(10, 0, true); // Last mod file time
    view.setUint16(12, 0, true); // Last mod file date
    view.setUint32(14, crc, true); // CRC-32
    view.setUint32(18, contentBytes.length, true); // Compressed size
    view.setUint32(22, contentBytes.length, true); // Uncompressed size
    view.setUint16(26, filenameBytes.length, true); // File name length
    view.setUint16(28, 0, true); // Extra field length
    
    localHeader.set(filenameBytes, 30);

    // Central directory header
    const centralHeader = new Uint8Array(46 + filenameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    
    centralView.setUint32(0, 0x02014b50, true); // Central file header signature
    centralView.setUint16(4, 20, true); // Version made by
    centralView.setUint16(6, 20, true); // Version needed to extract
    centralView.setUint16(8, 0, true); // General purpose bit flag
    centralView.setUint16(10, 0, true); // Compression method
    centralView.setUint16(12, 0, true); // Last mod file time
    centralView.setUint16(14, 0, true); // Last mod file date
    centralView.setUint32(16, crc, true); // CRC-32
    centralView.setUint32(20, contentBytes.length, true); // Compressed size
    centralView.setUint32(24, contentBytes.length, true); // Uncompressed size
    centralView.setUint16(28, filenameBytes.length, true); // File name length
    centralView.setUint16(30, 0, true); // Extra field length
    centralView.setUint16(32, 0, true); // File comment length
    centralView.setUint16(34, 0, true); // Disk number start
    centralView.setUint16(36, 0, true); // Internal file attributes
    centralView.setUint32(38, 0, true); // External file attributes
    centralView.setUint32(42, offset, true); // Relative offset of local header
    
    centralHeader.set(filenameBytes, 46);

    fileEntries.push(localHeader, contentBytes);
    centralDir.push(centralHeader);
    offset += localHeader.length + contentBytes.length;
  }

  // End of central directory record
  const centralDirSize = centralDir.reduce((sum, entry) => sum + entry.length, 0);
  const endOfCentralDir = new Uint8Array(22);
  const endView = new DataView(endOfCentralDir.buffer);
  
  endView.setUint32(0, 0x06054b50, true); // End of central dir signature
  endView.setUint16(4, 0, true); // Number of this disk
  endView.setUint16(6, 0, true); // Number of the disk with the start of the central directory
  endView.setUint16(8, Object.keys(files).length, true); // Total number of entries in the central directory on this disk
  endView.setUint16(10, Object.keys(files).length, true); // Total number of entries in the central directory
  endView.setUint32(12, centralDirSize, true); // Size of the central directory
  endView.setUint32(16, offset, true); // Offset of start of central directory
  endView.setUint16(20, 0, true); // ZIP file comment length

  // Combine all parts
  const totalSize = fileEntries.reduce((sum, entry) => sum + entry.length, 0) + centralDirSize + endOfCentralDir.length;
  const result = new Uint8Array(totalSize);
  let pos = 0;

  for (const entry of fileEntries) {
    result.set(entry, pos);
    pos += entry.length;
  }
  
  for (const entry of centralDir) {
    result.set(entry, pos);
    pos += entry.length;
  }
  
  result.set(endOfCentralDir, pos);
  
  return result;
}

// Create PNG images with specified dimensions
function createMinimalPNG(r = 128, g = 128, b = 128, size = 72): Uint8Array {
  const width = size;
  const height = size;
  
  // Create a simple PNG with solid color
  const header = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG signature
  
  // IHDR chunk
  const ihdrData = new Uint8Array(13);
  const ihdrView = new DataView(ihdrData.buffer);
  ihdrView.setUint32(0, width, false);
  ihdrView.setUint32(4, height, false);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  // Create IHDR chunk with length and CRC
  const ihdrChunk = new Uint8Array(4 + 4 + 13 + 4);
  const ihdrChunkView = new DataView(ihdrChunk.buffer);
  ihdrChunkView.setUint32(0, 13, false); // length
  ihdrChunk.set(new TextEncoder().encode('IHDR'), 4);
  ihdrChunk.set(ihdrData, 8);
  ihdrChunkView.setUint32(21, crc32(ihdrChunk.slice(4, 21)), false); // CRC
  
  // Create minimal IDAT chunk with solid color
  const pixelData = new Uint8Array(height * (1 + width * 3)); // 1 filter byte per row + RGB data
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    pixelData[rowStart] = 0; // No filter
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;
      pixelData[pixelStart] = r;
      pixelData[pixelStart + 1] = g;
      pixelData[pixelStart + 2] = b;
    }
  }
  
  // Simple zlib compression (uncompressed)
  const zlibData = new Uint8Array(2 + pixelData.length + 4);
  zlibData[0] = 0x78; // CMF
  zlibData[1] = 0x01; // FLG
  zlibData.set(pixelData, 2);
  // Adler32 checksum (simplified to 0x00000001)
  zlibData.set([0, 0, 0, 1], 2 + pixelData.length);
  
  const idatChunk = new Uint8Array(4 + 4 + zlibData.length + 4);
  const idatChunkView = new DataView(idatChunk.buffer);
  idatChunkView.setUint32(0, zlibData.length, false);
  idatChunk.set(new TextEncoder().encode('IDAT'), 4);
  idatChunk.set(zlibData, 8);
  idatChunkView.setUint32(8 + zlibData.length, crc32(idatChunk.slice(4, 8 + zlibData.length)), false);
  
  // IEND chunk
  const iendChunk = new Uint8Array([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
  
  // Combine all chunks
  const png = new Uint8Array(header.length + ihdrChunk.length + idatChunk.length + iendChunk.length);
  let offset = 0;
  png.set(header, offset); offset += header.length;
  png.set(ihdrChunk, offset); offset += ihdrChunk.length;
  png.set(idatChunk, offset); offset += idatChunk.length;
  png.set(iendChunk, offset);
  
  return png;
}

// Create action icons (72x72 and 144x144)
function createActionIconPNG(r = 128, g = 128, b = 128, size = 144): Uint8Array {
  return createMinimalPNG(r, g, b, size);
}

// Create plugin icons (256x256 and 512x512)
function createPluginIconPNG(r = 128, g = 128, b = 128, size = 256): Uint8Array {
  return createMinimalPNG(r, g, b, size);
}

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

    // Create PNG images in required sizes (72x72 and 144x144 @2x)
    const playPng = createMinimalPNG(0, 200, 0);     // Green for play
    const playPng2x = createActionIconPNG(0, 200, 0, 144);  // 144x144 @2x
    const pausePng = createMinimalPNG(200, 200, 0);  // Yellow for pause  
    const pausePng2x = createActionIconPNG(200, 200, 0, 144);
    const forwardPng = createMinimalPNG(0, 0, 200);  // Blue for forward
    const forwardPng2x = createActionIconPNG(0, 0, 200, 144);
    const backwardPng = createMinimalPNG(200, 0, 200); // Purple for backward
    const backwardPng2x = createActionIconPNG(200, 0, 200, 144);
    const resetPng = createMinimalPNG(200, 0, 0);    // Red for reset
    const resetPng2x = createActionIconPNG(200, 0, 0, 144);
    const statusPng = createMinimalPNG(128, 128, 128); // Gray for status
    const statusPng2x = createActionIconPNG(128, 128, 128, 144);
    const pluginPng = createPluginIconPNG(100, 150, 200, 256); // 256x256 plugin icon
    const pluginPng2x = createPluginIconPNG(100, 150, 200, 512); // 512x512 @2x plugin icon

    // Plugin files structure - must be in a .sdPlugin folder
    const pluginFiles = {
      'com.cuer.showcaller.sdPlugin/manifest.json': JSON.stringify({
        "$schema": "https://schemas.elgato.com/streamdeck/plugins/manifest.json",
        "Actions": [
          {
            "Icon": "imgs/play",
            "Name": "Play/Pause",
            "States": [
              {
                "Image": "imgs/play",
                "TitleAlignment": "bottom",
                "ShowTitle": true
              },
              {
                "Image": "imgs/pause",
                "TitleAlignment": "bottom", 
                "ShowTitle": true
              }
            ],
            "SupportedInMultiActions": true,
            "Tooltip": "Play or pause the current rundown",
            "UUID": "com.cuer.showcaller.playpause"
          },
          {
            "Icon": "imgs/forward",
            "Name": "Forward",
            "States": [
              {
                "Image": "imgs/forward",
                "TitleAlignment": "bottom",
                "ShowTitle": true
              }
            ],
            "SupportedInMultiActions": true,
            "Tooltip": "Go to next segment",
            "UUID": "com.cuer.showcaller.forward"
          },
          {
            "Icon": "imgs/backward",
            "Name": "Backward", 
            "States": [
              {
                "Image": "imgs/backward",
                "TitleAlignment": "bottom",
                "ShowTitle": true
              }
            ],
            "SupportedInMultiActions": true,
            "Tooltip": "Go to previous segment",
            "UUID": "com.cuer.showcaller.backward"
          },
          {
            "Icon": "imgs/reset",
            "Name": "Reset",
            "States": [
              {
                "Image": "imgs/reset",
                "TitleAlignment": "bottom",
                "ShowTitle": true
              }
            ],
            "SupportedInMultiActions": true,
            "Tooltip": "Reset to beginning",
            "UUID": "com.cuer.showcaller.reset"
          },
          {
            "Icon": "imgs/status",
            "Name": "Status Display",
            "States": [
              {
                "Image": "imgs/status",
                "TitleAlignment": "bottom",
                "ShowTitle": true
              }
            ],
            "SupportedInMultiActions": false,
            "Tooltip": "Shows current segment and status",
            "UUID": "com.cuer.showcaller.status"
          }
        ],
        "Author": "Cuer",
        "CodePath": "bin/plugin.js",
        "Description": "Control your Cuer rundowns from Stream Deck",
        "Name": "Cuer Showcaller",
        "Icon": "imgs/pluginIcon",
        "PropertyInspectorPath": "ui/propertyinspector.html",
        "UUID": "com.cuer.showcaller",
        "Version": "1.0.0",
        "SDKVersion": 2,
        "Nodejs": {
          "Version": "20"
        },
        "OS": [
          {
            "Platform": "mac",
            "MinimumVersion": "13"
          },
          {
            "Platform": "windows", 
            "MinimumVersion": "10"
          }
        ],
        "Software": {
          "MinimumVersion": "6.4"
        }
      }, null, 2),
      
      // Action images (72x72 and 144x144 @2x required)
      'com.cuer.showcaller.sdPlugin/imgs/play.png': playPng,
      'com.cuer.showcaller.sdPlugin/imgs/play@2x.png': playPng2x,
      'com.cuer.showcaller.sdPlugin/imgs/pause.png': pausePng,
      'com.cuer.showcaller.sdPlugin/imgs/pause@2x.png': pausePng2x,
      'com.cuer.showcaller.sdPlugin/imgs/forward.png': forwardPng,
      'com.cuer.showcaller.sdPlugin/imgs/forward@2x.png': forwardPng2x,
      'com.cuer.showcaller.sdPlugin/imgs/backward.png': backwardPng,
      'com.cuer.showcaller.sdPlugin/imgs/backward@2x.png': backwardPng2x,
      'com.cuer.showcaller.sdPlugin/imgs/reset.png': resetPng,
      'com.cuer.showcaller.sdPlugin/imgs/reset@2x.png': resetPng2x,
      'com.cuer.showcaller.sdPlugin/imgs/status.png': statusPng,
      'com.cuer.showcaller.sdPlugin/imgs/status@2x.png': statusPng2x,
      
      // Plugin icons (256x256 and 512x512 @2x required)
      'com.cuer.showcaller.sdPlugin/imgs/pluginIcon.png': pluginPng,
      'com.cuer.showcaller.sdPlugin/imgs/pluginIcon@2x.png': pluginPng2x,
      'com.cuer.showcaller.sdPlugin/imgs/categoryIcon.png': pluginPng,
      'com.cuer.showcaller.sdPlugin/imgs/categoryIcon@2x.png': pluginPng2x,
      
      'com.cuer.showcaller.sdPlugin/bin/plugin.js': `// Cuer ShowCaller Stream Deck Plugin
class CuerShowcallerPlugin {
    constructor() {
        this.websocket = null;
        this.pluginUUID = null;
        this.apiToken = null;
        this.rundownId = null;
        this.apiBaseUrl = 'https://khdiwrkgahsbjszlwnob.supabase.co/functions/v1';
        
        // Action UUIDs
        this.actions = {
            PLAY_PAUSE: 'com.cuer.showcaller.playpause',
            FORWARD: 'com.cuer.showcaller.forward',
            BACKWARD: 'com.cuer.showcaller.backward',
            RESET: 'com.cuer.showcaller.reset',
            STATUS: 'com.cuer.showcaller.status'
        };
    }

    init(websocket, registerInfo) {
        this.websocket = websocket;
        this.pluginUUID = registerInfo.uuid;
        
        // Setup WebSocket message handler
        this.websocket.onmessage = (evt) => {
            const jsonObj = JSON.parse(evt.data);
            this.handleMessage(jsonObj);
        };
    }

    handleMessage(jsonObj) {
        switch (jsonObj.event) {
            case 'keyDown':
                this.handleKeyDown(jsonObj);
                break;
            case 'willAppear':
                this.handleWillAppear(jsonObj);
                break;
            case 'didReceiveSettings':
                this.handleSettingsReceived(jsonObj);
                break;
        }
    }

    handleKeyDown(jsonObj) {
        const { action, context, payload } = jsonObj;
        
        if (!this.apiToken || !this.rundownId) {
            this.showAlert(context);
            return;
        }

        switch (action) {
            case this.actions.PLAY_PAUSE:
                this.handlePlayPause(context);
                break;
            case this.actions.FORWARD:
                this.callAPI('showcaller-forward', context);
                break;
            case this.actions.BACKWARD:
                this.callAPI('showcaller-backward', context);
                break;
            case this.actions.RESET:
                this.callAPI('showcaller-reset', context);
                break;
        }
    }

    async handlePlayPause(context) {
        try {
            const status = await this.getStatus();
            const endpoint = status.isPlaying ? 'showcaller-pause' : 'showcaller-play';
            await this.callAPI(endpoint, context);
        } catch (error) {
            console.error('Play/Pause error:', error);
            this.showAlert(context);
        }
    }

    async callAPI(endpoint, context) {
        try {
            const response = await fetch(\`\${this.apiBaseUrl}/\${endpoint}\`, {
                method: 'POST',
                headers: {
                    'Authorization': \`Bearer \${this.apiToken}\`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rundownId: this.rundownId })
            });

            if (response.ok) {
                this.showOk(context);
            } else {
                this.showAlert(context);
            }
        } catch (error) {
            console.error('API call error:', error);
            this.showAlert(context);
        }
    }

    async getStatus() {
        const response = await fetch(\`\${this.apiBaseUrl}/showcaller-status\`, {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${this.apiToken}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rundownId: this.rundownId })
        });
        
        if (!response.ok) throw new Error('Status fetch failed');
        return await response.json();
    }

    async updateStatus(context) {
        try {
            const status = await this.getStatus();
            const title = \`\${status.currentItem?.name || 'No item'}\`;
            
            this.setTitle(context, title);
            this.setState(context, status.isPlaying ? 1 : 0);
        } catch (error) {
            this.setTitle(context, 'Error');
        }
    }

    handleWillAppear(jsonObj) {
        const { action, context } = jsonObj;
        
        if (action === this.actions.PLAY_PAUSE) {
            this.updatePlayPauseState(context);
        } else if (action === this.actions.STATUS) {
            this.updateStatus(context);
        }
    }

    async updatePlayPauseState(context) {
        if (!this.apiToken || !this.rundownId) return;
        
        try {
            const status = await this.getStatus();
            this.setState(context, status.isPlaying ? 1 : 0);
        } catch (error) {
            console.error('Update state error:', error);
        }
    }

    handleSettingsReceived(jsonObj) {
        const settings = jsonObj.payload.settings;
        this.apiToken = settings.apiToken;
        this.rundownId = settings.rundownId;
    }

    // Stream Deck communication methods
    setTitle(context, title) {
        const payload = { title };
        this.sendToStreamDeck('setTitle', context, payload);
    }

    setState(context, state) {
        const payload = { state };
        this.sendToStreamDeck('setState', context, payload);
    }

    showAlert(context) {
        this.sendToStreamDeck('showAlert', context);
    }

    showOk(context) {
        this.sendToStreamDeck('showOk', context);
    }

    sendToStreamDeck(event, context, payload = {}) {
        if (this.websocket) {
            const json = { event, context, payload };
            this.websocket.send(JSON.stringify(json));
        }
    }
}

// Initialize plugin
const plugin = new CuerShowcallerPlugin();

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
    const websocket = new WebSocket(\`ws://127.0.0.1:\${inPort}\`);
    
    websocket.onopen = () => {
        const registerInfo = { event: inRegisterEvent, uuid: inPluginUUID };
        websocket.send(JSON.stringify(registerInfo));
        plugin.init(websocket, { uuid: inPluginUUID });
    };
    
    websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Stream Deck SDK initialization
if (typeof connectElgatoStreamDeckSocket !== 'undefined') {
    // This will be called by Stream Deck with the appropriate parameters
}`,
      
      'com.cuer.showcaller.sdPlugin/ui/propertyinspector.html': `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Cuer Showcaller Configuration</title>
    <link rel="stylesheet" href="../css/propertyinspector.css">
</head>
<body>
    <div class="sdpi-wrapper">
        <div class="sdpi-item">
            <div class="sdpi-item-label">Account</div>
            <button class="sdpi-item-value" id="loginButton">Login to Cuer</button>
            <div class="sdpi-item-value" id="userInfo" style="display: none;">
                <span id="userEmail"></span>
                <button id="logoutButton" style="margin-left: 10px; padding: 4px 8px; font-size: 12px;">Logout</button>
            </div>
        </div>
        
        <div class="sdpi-item">
            <div class="sdpi-item-label">Rundown</div>
            <select class="sdpi-item-value" id="rundownSelect" disabled>
                <option value="">Login first to see rundowns...</option>
            </select>
        </div>
        
        <div class="sdpi-item">
            <button class="sdpi-item-value" id="refreshButton" disabled>Refresh Rundowns</button>
        </div>
        
        <div class="sdpi-item">
            <div class="sdpi-item-label">Status</div>
            <div class="sdpi-item-value" id="connectionStatus">Not connected</div>
        </div>
    </div>
    
    <script src="../js/propertyinspector.js"></script>
</body>
</html>`,
      
      'com.cuer.showcaller.sdPlugin/js/propertyinspector.js': `class CuerPropertyInspector {
    constructor() {
        this.websocket = null;
        this.uuid = null;
        this.apiBaseUrl = 'https://8194d7ef-dbfa-40fb-ac2a-5f6a35bd131a.lovableproject.com';
        this.authToken = null;
        this.user = null;
        this.rundownId = null;
        
        this.initializeElements();
    }

    initializeElements() {
        this.loginButton = document.getElementById('loginButton');
        this.userInfo = document.getElementById('userInfo');
        this.userEmail = document.getElementById('userEmail');
        this.logoutButton = document.getElementById('logoutButton');
        this.rundownSelect = document.getElementById('rundownSelect');
        this.refreshButton = document.getElementById('refreshButton');
        this.connectionStatus = document.getElementById('connectionStatus');
        
        this.setupElements();
    }

    setupElements() {
        this.loginButton?.addEventListener('click', () => this.handleLogin());
        this.logoutButton?.addEventListener('click', () => this.handleLogout());
        this.refreshButton?.addEventListener('click', () => this.loadRundowns());
        this.rundownSelect?.addEventListener('change', (e) => {
            this.rundownId = e.target.value;
            this.saveSettings();
        });
    }

    handleLogin() {
        const popup = window.open(
            'https://8194d7ef-dbfa-40fb-ac2a-5f6a35bd131a.lovableproject.com/login?streamdeck=true',
            'cuer-login',
            'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        const messageHandler = (event) => {
            if (event.origin !== 'https://8194d7ef-dbfa-40fb-ac2a-5f6a35bd131a.lovableproject.com') return;
            
            if (event.data.type === 'CUER_AUTH_SUCCESS') {
                this.authToken = event.data.token;
                this.user = event.data.user;
                
                popup.close();
                window.removeEventListener('message', messageHandler);
                
                this.onAuthSuccess({ access_token: event.data.token }, event.data.user);
            } else if (event.data.type === 'CUER_AUTH_ERROR') {
                popup.close();
                window.removeEventListener('message', messageHandler);
                
                this.updateConnectionStatus('Login failed', 'error');
            }
        };

        window.addEventListener('message', messageHandler);

        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                window.removeEventListener('message', messageHandler);
                
                if (!this.authToken) {
                    this.updateConnectionStatus('Login cancelled', 'error');
                }
            }
        }, 1000);
    }

    onAuthSuccess(session, user) {
        this.authToken = session.access_token;
        this.user = user;
        
        this.loginButton.style.display = 'none';
        this.userInfo.style.display = 'block';
        this.userEmail.textContent = user.email;
        
        this.rundownSelect.disabled = false;
        this.refreshButton.disabled = false;
        
        this.updateConnectionStatus('Connected', 'success');
        this.saveSettings();
        this.loadRundowns();
    }

    handleLogout() {
        this.authToken = null;
        this.user = null;
        this.rundownId = null;
        
        this.loginButton.style.display = 'block';
        this.userInfo.style.display = 'none';
        this.rundownSelect.disabled = true;
        this.refreshButton.disabled = true;
        this.rundownSelect.innerHTML = '<option value="">Login first to see rundowns...</option>';
        
        this.updateConnectionStatus('Not connected', 'default');
        this.saveSettings();
    }

    init(websocket, uuid, actionInfo) {
        this.websocket = websocket;
        this.uuid = uuid;
        
        this.loadSettings();
    }

    loadSettings() {
        // Settings would be loaded from Stream Deck here
        this.updateConnectionStatus('Ready to connect', 'default');
    }

    saveSettings() {
        const settings = {
            apiToken: this.authToken,
            user: this.user,
            rundownId: this.rundownId
        };
        
        if (this.websocket) {
            const json = {
                event: 'setSettings',
                context: this.uuid,
                payload: settings
            };
            this.websocket.send(JSON.stringify(json));
        }
    }

    async loadRundowns() {
        if (!this.authToken) return;
        
        try {
            const response = await fetch(\`\${this.apiBaseUrl}/rundown-api\`, {
                method: 'POST',
                headers: {
                    'Authorization': \`Bearer \${this.authToken}\`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'list' })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.populateRundownSelect(data.rundowns || []);
            } else {
                this.updateConnectionStatus('Failed to load rundowns', 'error');
            }
        } catch (error) {
            console.error('Load rundowns error:', error);
            this.updateConnectionStatus('Error loading rundowns', 'error');
        }
    }

    populateRundownSelect(rundowns) {
        this.rundownSelect.innerHTML = '<option value="">Select a rundown...</option>';
        
        rundowns.forEach(rundown => {
            const option = document.createElement('option');
            option.value = rundown.id;
            option.textContent = rundown.title || \`Rundown \${rundown.id}\`;
            if (rundown.id === this.rundownId) {
                option.selected = true;
            }
            this.rundownSelect.appendChild(option);
        });
    }

    updateConnectionStatus(message, type = 'default') {
        this.connectionStatus.textContent = message;
        this.connectionStatus.className = \`sdpi-item-value status-\${type}\`;
    }
}

// Initialize property inspector
const propertyInspector = new CuerPropertyInspector();

function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
    const websocket = new WebSocket(\`ws://127.0.0.1:\${inPort}\`);
    
    websocket.onopen = () => {
        const registerInfo = { event: inRegisterEvent, uuid: inPropertyInspectorUUID };
        websocket.send(JSON.stringify(registerInfo));
        propertyInspector.init(websocket, inPropertyInspectorUUID, inActionInfo);
    };
}`,
      
      'css/propertyinspector.css': `body {
    margin: 0;
    padding: 10px;
    background: #2D2D30;
    color: #D4D4D4;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 13px;
}

.sdpi-wrapper {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.sdpi-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.sdpi-item-label {
    font-weight: 500;
    color: #CCCCCC;
}

.sdpi-item-value {
    background: #3C3C3C;
    border: 1px solid #464647;
    color: #D4D4D4;
    padding: 6px 8px;
    border-radius: 3px;
    font-size: 13px;
}

.sdpi-item-value:focus {
    outline: none;
    border-color: #007ACC;
}

button.sdpi-item-value {
    background: #0E639C;
    border: 1px solid #0E639C;
    color: white;
    cursor: pointer;
}

button.sdpi-item-value:hover {
    background: #1177BB;
}

button.sdpi-item-value:disabled {
    background: #3C3C3C;
    border-color: #464647;
    color: #808080;
    cursor: not-allowed;
}

select.sdpi-item-value {
    background: #3C3C3C;
    border: 1px solid #464647;
}

.status-success {
    color: #4EC9B0 !important;
}

.status-error {
    color: #F44747 !important;
}

.status-default {
    color: #D4D4D4 !important;
}`
    };

    console.log('Creating ZIP file with', Object.keys(pluginFiles).length, 'files');
    const zipData = createZipFile(pluginFiles);
    console.log('ZIP file created, size:', zipData.length, 'bytes');

    return new Response(zipData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="com.cuer.showcaller.streamDeckPlugin"',
        'Content-Length': zipData.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error creating plugin:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to create plugin', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})