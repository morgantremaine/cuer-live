// Stream Deck plugin main logic
class CuerShowcallerPlugin {
    constructor() {
        this.websocket = null;
        this.pluginUUID = null;
        this.apiToken = null;
        this.selectedRundown = null;
        this.statusInterval = null;
        this.lastStatus = null;
        
        // API base URL
        this.apiBase = 'https://khdiwrkgahsbjszlwnob.functions.supabase.co/functions/v1/stream-deck-api';
        
        // Action UUIDs
        this.actions = {
            PLAY_PAUSE: 'com.cuer.showcaller.playpause',
            FORWARD: 'com.cuer.showcaller.forward',
            BACKWARD: 'com.cuer.showcaller.backward',
            RESET: 'com.cuer.showcaller.reset',
            STATUS: 'com.cuer.showcaller.status'
        };
    }

    // Initialize the plugin
    init(websocket, registerInfo) {
        console.log('🎛️ Cuer Showcaller plugin initializing...');
        
        this.websocket = websocket;
        this.pluginUUID = registerInfo.plugin;
        
        // Register for events
        websocket.onmessage = (event) => {
            const jsonObj = JSON.parse(event.data);
            console.log('📨 Received message:', jsonObj.event);
            this.handleMessage(jsonObj);
        };
        
        websocket.onopen = () => {
            console.log('✅ WebSocket connected');
        };
        
        websocket.onclose = () => {
            console.log('❌ WebSocket disconnected');
        };
        
        console.log('✅ Plugin initialized');
    }

    // Handle messages from Stream Deck
    handleMessage(jsonObj) {
        switch (jsonObj.event) {
            case 'keyDown':
                this.handleKeyDown(jsonObj);
                break;
            case 'willAppear':
                this.handleWillAppear(jsonObj);
                break;
            case 'willDisappear':
                this.handleWillDisappear(jsonObj);
                break;
            case 'didReceiveSettings':
                this.handleSettingsReceived(jsonObj);
                break;
            case 'propertyInspectorDidAppear':
                this.handlePropertyInspectorAppear(jsonObj);
                break;
        }
    }

    // Handle key press
    handleKeyDown(jsonObj) {
        const { action, context, payload } = jsonObj;
        const settings = payload.settings || {};
        
        console.log(`🔘 Key pressed: ${action}`);
        
        if (!settings.apiToken || !settings.rundownId) {
            this.showAlert(context);
            return;
        }

        this.apiToken = settings.apiToken;
        this.selectedRundown = settings.rundownId;

        switch (action) {
            case this.actions.PLAY_PAUSE:
                this.handlePlayPause(context);
                break;
            case this.actions.FORWARD:
                this.callAPI('forward', context);
                break;
            case this.actions.BACKWARD:
                this.callAPI('backward', context);
                break;
            case this.actions.RESET:
                this.callAPI('reset', context);
                break;
            case this.actions.STATUS:
                this.updateStatus(context);
                break;
        }
    }

    // Handle play/pause toggle
    async handlePlayPause(context) {
        try {
            const status = await this.getStatus();
            if (status && status.status) {
                const isPlaying = status.status.isPlaying;
                if (isPlaying) {
                    await this.callAPI('pause', context);
                } else {
                    await this.callAPI('play', context);
                }
            }
        } catch (error) {
            console.error('❌ Error in play/pause:', error);
            this.showAlert(context);
        }
    }

    // Make API call to Cuer
    async callAPI(endpoint, context) {
        if (!this.apiToken || !this.selectedRundown) {
            this.showAlert(context);
            return;
        }

        try {
            const url = `${this.apiBase}/${endpoint}/${this.selectedRundown}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                console.log(`✅ ${endpoint} successful`);
                this.showOk(context);
                // Update all status displays
                this.updateAllStatusDisplays();
            } else {
                console.error(`❌ ${endpoint} failed:`, response.status);
                this.showAlert(context);
            }
        } catch (error) {
            console.error(`❌ Error calling ${endpoint}:`, error);
            this.showAlert(context);
        }
    }

    // Get current status
    async getStatus() {
        if (!this.apiToken || !this.selectedRundown) {
            return null;
        }

        try {
            const url = `${this.apiBase}/status/${this.selectedRundown}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`
                }
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('❌ Error getting status:', error);
        }
        
        return null;
    }

    // Update status display
    async updateStatus(context) {
        const status = await this.getStatus();
        if (status) {
            this.lastStatus = status;
            this.updateStatusDisplay(context, status);
        }
    }

    // Update status display on button
    updateStatusDisplay(context, status) {
        const { currentItem, status: showcallerStatus } = status;
        
        let title = 'No Item';
        if (currentItem && currentItem.name) {
            title = currentItem.name.length > 12 
                ? currentItem.name.substring(0, 12) + '...'
                : currentItem.name;
        }
        
        const isPlaying = showcallerStatus?.isPlaying || false;
        const subtitle = isPlaying ? '▶️ Playing' : '⏸️ Paused';
        
        this.setTitle(context, `${title}\n${subtitle}`);
    }

    // Update all status displays when state changes
    updateAllStatusDisplays() {
        // This would need to track all active status contexts
        // For now, just trigger a refresh on the next status update
        setTimeout(() => {
            if (this.lastStatus) {
                // Send update to all status displays
                Object.keys(this.contextToAction || {}).forEach(context => {
                    if (this.contextToAction[context] === this.actions.STATUS) {
                        this.updateStatusDisplay(context, this.lastStatus);
                    }
                });
            }
        }, 500);
    }

    // Handle button appearance
    handleWillAppear(jsonObj) {
        const { context, action, payload } = jsonObj;
        const settings = payload.settings || {};
        
        console.log(`👁️ Button appeared: ${action}`);
        
        // Track context to action mapping
        if (!this.contextToAction) {
            this.contextToAction = {};
        }
        this.contextToAction[context] = action;
        
        // Update play/pause button state based on current status
        if (action === this.actions.PLAY_PAUSE && settings.apiToken && settings.rundownId) {
            this.apiToken = settings.apiToken;
            this.selectedRundown = settings.rundownId;
            this.updatePlayPauseState(context);
        }
        
        // Update status display
        if (action === this.actions.STATUS && settings.apiToken && settings.rundownId) {
            this.apiToken = settings.apiToken;
            this.selectedRundown = settings.rundownId;
            this.updateStatus(context);
        }
    }

    // Update play/pause button visual state
    async updatePlayPauseState(context) {
        const status = await this.getStatus();
        if (status && status.status) {
            const isPlaying = status.status.isPlaying;
            this.setState(context, isPlaying ? 1 : 0); // 1 = pause icon, 0 = play icon
        }
    }

    // Handle button disappearance
    handleWillDisappear(jsonObj) {
        const { context } = jsonObj;
        console.log('👋 Button disappeared');
        
        if (this.contextToAction) {
            delete this.contextToAction[context];
        }
    }

    // Handle settings received
    handleSettingsReceived(jsonObj) {
        const { payload, context } = jsonObj;
        const settings = payload.settings || {};
        
        console.log('⚙️ Settings received:', settings);
        
        if (settings.apiToken && settings.rundownId) {
            this.apiToken = settings.apiToken;
            this.selectedRundown = settings.rundownId;
            
            // Update button states
            if (this.contextToAction && this.contextToAction[context] === this.actions.PLAY_PAUSE) {
                this.updatePlayPauseState(context);
            }
            
            if (this.contextToAction && this.contextToAction[context] === this.actions.STATUS) {
                this.updateStatus(context);
            }
        }
    }

    // Handle property inspector appearance
    handlePropertyInspectorAppear(jsonObj) {
        console.log('🔧 Property inspector appeared');
    }

    // Utility methods for Stream Deck communication
    setTitle(context, title) {
        this.websocket.send(JSON.stringify({
            event: 'setTitle',
            context: context,
            payload: {
                title: title,
                target: 0
            }
        }));
    }

    setState(context, state) {
        this.websocket.send(JSON.stringify({
            event: 'setState',
            context: context,
            payload: {
                state: state
            }
        }));
    }

    showAlert(context) {
        this.websocket.send(JSON.stringify({
            event: 'showAlert',
            context: context
        }));
    }

    showOk(context) {
        this.websocket.send(JSON.stringify({
            event: 'showOk',
            context: context
        }));
    }
}

// Initialize plugin when Stream Deck connects
let plugin = new CuerShowcallerPlugin();

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
    const websocket = new WebSocket(`ws://127.0.0.1:${inPort}`);
    
    websocket.onopen = () => {
        const json = {
            event: inRegisterEvent,
            uuid: inPluginUUID
        };
        websocket.send(JSON.stringify(json));
        
        // Initialize plugin
        plugin.init(websocket, { plugin: inPluginUUID });
    };
}

// Stream Deck will call this function
if (typeof $SD !== 'undefined') {
    $SD.on('connected', (jsonObj) => {
        plugin.init($SD.websocket, jsonObj);
    });
} else {
    // Fallback for manual connection
    console.log('⚠️ Stream Deck SDK not found, using manual connection');
}