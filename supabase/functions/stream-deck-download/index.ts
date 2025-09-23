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

function createZipFile(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder();
  const fileEntries: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const [filename, content] of Object.entries(files)) {
    const filenameBytes = encoder.encode(filename);
    const contentBytes = encoder.encode(content);
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
        "$schema": "https://schemas.elgato.com/streamdeck/plugins/manifest.json",
        "Name": "Cuer ShowCaller",
        "Description": "Control your Cuer rundown showcaller directly from Stream Deck",
        "Category": "Cuer",
        "Author": "Cuer",
        "Icon": "Images/pluginIcon",
        "UUID": "com.cuer.showcaller",
        "CodePath": "bin/plugin.js",
        "PropertyInspectorPath": "ui/propertyinspector.html",
        "Version": "1.0.0.0",
        "SDKVersion": 2,
        "Nodejs": {
          "Version": "20"
        },
        "Software": {
          "MinimumVersion": "6.6"
        },
        "OS": [
          { "Platform": "mac", "MinimumVersion": "13" },
          { "Platform": "windows", "MinimumVersion": "10" }
        ],
        "Actions": [
          {
            "UUID": "com.cuer.showcaller.playpause",
            "Name": "Play/Pause",
            "Icon": "Images/play",
            "States": [
              { 
                "Image": "Images/play", 
                "Name": "Play",
                "ShowTitle": true,
                "TitleAlignment": "bottom"
              },
              { 
                "Image": "Images/pause", 
                "Name": "Pause",
                "ShowTitle": true,
                "TitleAlignment": "bottom"
              }
            ],
            "PropertyInspectorPath": "ui/propertyinspector.html",
            "SupportedInMultiActions": true,
            "Tooltip": "Toggle rundown play/pause"
          },
          {
            "UUID": "com.cuer.showcaller.forward",
            "Name": "Forward",
            "Icon": "Images/forward",
            "States": [
              {
                "Image": "Images/forward",
                "ShowTitle": true,
                "TitleAlignment": "bottom"
              }
            ],
            "PropertyInspectorPath": "ui/propertyinspector.html",
            "SupportedInMultiActions": true,
            "Tooltip": "Move to next segment"
          },
          {
            "UUID": "com.cuer.showcaller.backward",
            "Name": "Backward", 
            "Icon": "Images/backward",
            "States": [
              {
                "Image": "Images/backward",
                "ShowTitle": true,
                "TitleAlignment": "bottom"
              }
            ],
            "PropertyInspectorPath": "ui/propertyinspector.html",
            "SupportedInMultiActions": true,
            "Tooltip": "Move to previous segment"
          },
          {
            "UUID": "com.cuer.showcaller.reset",
            "Name": "Reset",
            "Icon": "Images/reset",
            "States": [
              {
                "Image": "Images/reset",
                "ShowTitle": true,
                "TitleAlignment": "bottom"
              }
            ],
            "PropertyInspectorPath": "ui/propertyinspector.html",
            "SupportedInMultiActions": true,
            "Tooltip": "Reset to beginning"
          },
          {
            "UUID": "com.cuer.showcaller.status",
            "Name": "Status Display",
            "Icon": "Images/status",
            "States": [
              {
                "Image": "Images/status",
                "ShowTitle": true,
                "TitleAlignment": "bottom"
              }
            ],
            "PropertyInspectorPath": "ui/propertyinspector.html",
            "SupportedInMultiActions": false,
            "Tooltip": "Show current segment status"
          }
        ]
      }, null, 2),
      
      
      'bin/plugin.js': `// Cuer ShowCaller Stream Deck Plugin
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
            const subtitle = status.isPlaying ? 'Playing' : 'Paused';
            
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

// Stream Deck SDK initialization - this will be called by Stream Deck
if (typeof connectElgatoStreamDeckSocket !== 'undefined') {
    // This function will be called by Stream Deck with the appropriate parameters
}`,

      'ui/propertyinspector.html': `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Cuer ShowCaller - Property Inspector</title>
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

      'js/propertyinspector.js': `// Property Inspector for Cuer ShowCaller
class CuerPropertyInspector {
    constructor() {
        this.websocket = null;
        this.uuid = null;
        this.actionInfo = null;
        this.apiBaseUrl = 'https://khdiwrkgahsbjszlwnob.supabase.co/functions/v1';
        this.authToken = null;
        this.currentUser = null;
        this.selectedRundownId = null;
    }

    init(websocket, uuid, actionInfo) {
        this.websocket = websocket;
        this.uuid = uuid;
        this.actionInfo = actionInfo;
        
        this.initializeElements();
        this.loadSettings();
    }

    initializeElements() {
        const loginButton = document.getElementById('loginButton');
        const logoutButton = document.getElementById('logoutButton');
        const refreshButton = document.getElementById('refreshButton');
        const rundownSelect = document.getElementById('rundownSelect');

        if (loginButton) {
            loginButton.addEventListener('click', () => this.handleLogin());
        }
        
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }
        
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.loadRundowns());
        }
        
        if (rundownSelect) {
            rundownSelect.addEventListener('change', (e) => {
                this.selectedRundownId = e.target.value;
                this.saveSettings();
            });
        }
    }

    handleLogin() {
        const authUrl = 'https://khdiwrkgahsbjszlwnob.supabase.co/auth/v1/authorize?provider=email';
        const popup = window.open(authUrl, 'cuer-auth', 'width=500,height=600');
        
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                this.updateConnectionStatus('Login cancelled', 'warning');
            }
        }, 1000);
        
        // Listen for auth success message
        window.addEventListener('message', (event) => {
            if (event.data.type === 'CUER_AUTH_SUCCESS') {
                clearInterval(checkClosed);
                popup.close();
                this.onAuthSuccess(event.data.token, event.data.user);
            }
        });
    }

    onAuthSuccess(token, user) {
        this.authToken = token;
        this.currentUser = user;
        
        document.getElementById('loginButton').style.display = 'none';
        document.getElementById('userInfo').style.display = 'block';
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('rundownSelect').disabled = false;
        document.getElementById('refreshButton').disabled = false;
        
        this.updateConnectionStatus('Connected', 'success');
        this.loadRundowns();
        this.saveSettings();
    }

    handleLogout() {
        this.authToken = null;
        this.currentUser = null;
        this.selectedRundownId = null;
        
        document.getElementById('loginButton').style.display = 'block';
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('rundownSelect').disabled = true;
        document.getElementById('refreshButton').disabled = true;
        
        const rundownSelect = document.getElementById('rundownSelect');
        rundownSelect.innerHTML = '<option value="">Login first to see rundowns...</option>';
        
        this.updateConnectionStatus('Not connected', 'error');
        this.saveSettings();
    }

    async loadRundowns() {
        if (!this.authToken) return;
        
        try {
            this.updateConnectionStatus('Loading rundowns...', 'info');
            
            const response = await fetch(\`\${this.apiBaseUrl}/get-rundowns\`, {
                method: 'GET',
                headers: {
                    'Authorization': \`Bearer \${this.authToken}\`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const rundowns = await response.json();
                this.populateRundownSelect(rundowns);
                this.updateConnectionStatus('Rundowns loaded', 'success');
            } else {
                throw new Error('Failed to load rundowns');
            }
        } catch (error) {
            console.error('Error loading rundowns:', error);
            this.updateConnectionStatus('Failed to load rundowns', 'error');
        }
    }

    populateRundownSelect(rundowns) {
        const select = document.getElementById('rundownSelect');
        select.innerHTML = '<option value="">Select a rundown...</option>';
        
        rundowns.forEach(rundown => {
            const option = document.createElement('option');
            option.value = rundown.id;
            option.textContent = rundown.name;
            option.selected = rundown.id === this.selectedRundownId;
            select.appendChild(option);
        });
    }

    updateConnectionStatus(message, type) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = \`connection-status \${type}\`;
        }
    }

    loadSettings() {
        if (this.actionInfo && this.actionInfo.payload && this.actionInfo.payload.settings) {
            const settings = this.actionInfo.payload.settings;
            this.authToken = settings.apiToken;
            this.currentUser = settings.user;
            this.selectedRundownId = settings.rundownId;
            
            if (this.authToken && this.currentUser) {
                this.onAuthSuccess(this.authToken, this.currentUser);
            }
        }
    }

    saveSettings() {
        const settings = {
            apiToken: this.authToken,
            user: this.currentUser,
            rundownId: this.selectedRundownId
        };
        
        if (this.websocket) {
            const payload = {
                event: 'setSettings',
                context: this.uuid,
                payload: settings
            };
            this.websocket.send(JSON.stringify(payload));
        }
    }
}

// Initialize property inspector
const propertyInspector = new CuerPropertyInspector();

function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
    const websocket = new WebSocket(\`ws://127.0.0.1:\${inPort}\`);
    
    websocket.onopen = () => {
        const registerInfo = { event: inRegisterEvent, uuid: inPropertyInspectorUUID };
        websocket.send(JSON.stringify(registerInfo));
        propertyInspector.init(websocket, inPropertyInspectorUUID, JSON.parse(inActionInfo));
    };
}`,

      'css/propertyinspector.css': `.sdpi-wrapper {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 16px;
    background: var(--c-bg-primary);
    color: var(--c-fg-primary);
}

.sdpi-item {
    margin-bottom: 16px;
}

.sdpi-item-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--c-fg-secondary);
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.sdpi-item-value {
    width: 100%;
    padding: 8px 12px;
    background: var(--c-bg-secondary);
    border: 1px solid var(--c-border);
    border-radius: 4px;
    color: var(--c-fg-primary);
    font-size: 13px;
}

button.sdpi-item-value {
    background: var(--c-btn-bg);
    color: var(--c-btn-fg);
    cursor: pointer;
    transition: background-color 0.2s;
}

button.sdpi-item-value:hover {
    background: var(--c-btn-bg-hover);
}

button.sdpi-item-value:disabled {
    background: var(--c-bg-disabled);
    color: var(--c-fg-disabled);
    cursor: not-allowed;
}

select.sdpi-item-value {
    cursor: pointer;
}

select.sdpi-item-value:disabled {
    background: var(--c-bg-disabled);
    color: var(--c-fg-disabled);
    cursor: not-allowed;
}

#userInfo {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

#userEmail {
    font-weight: 500;
}

#logoutButton {
    padding: 4px 8px !important;
    font-size: 11px !important;
    margin-left: 8px;
    width: auto !important;
}

.connection-status {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 3px;
    font-weight: 500;
}

.connection-status.success {
    background: #2d5a2d;
    color: #90ee90;
}

.connection-status.error {
    background: #5a2d2d;
    color: #ff9999;
}

.connection-status.warning {
    background: #5a4d2d;
    color: #ffcc99;
}

.connection-status.info {
    background: #2d3d5a;
    color: #99ccff;
}`,

      // Create placeholder image files (base64 encoded 1x1 pixel PNGs)
      'Images/play.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'Images/pause.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'Images/forward.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'Images/backward.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'Images/reset.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'Images/status.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'Images/pluginIcon.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'Images/categoryIcon.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    };

    console.log(`Creating zip with ${Object.keys(pluginFiles).length} files`);
    
    // Create the proper zip file
    const zipContent = createZipFile(pluginFiles);
    
    console.log(`Generated ZIP file size: ${zipContent.length} bytes`);

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