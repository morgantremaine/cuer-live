// Property Inspector JavaScript
class CuerPropertyInspector {
    constructor() {
        this.websocket = null;
        this.uuid = null;
        this.actionInfo = null;
        this.apiBase = 'https://khdiwrkgahsbjszlwnob.functions.supabase.co/functions/v1/stream-deck-api';
        
        this.initializeElements();
    }

    initializeElements() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupElements());
        } else {
            this.setupElements();
        }
    }

    setupElements() {
        // Get elements
        this.apiTokenInput = document.getElementById('apiToken');
        this.rundownSelect = document.getElementById('rundownSelect');
        this.refreshButton = document.getElementById('refreshButton');
        this.connectionStatus = document.getElementById('connectionStatus');

        // Add event listeners
        if (this.apiTokenInput) {
            this.apiTokenInput.addEventListener('input', () => this.saveSettings());
            this.apiTokenInput.addEventListener('blur', () => this.testConnection());
        }

        if (this.rundownSelect) {
            this.rundownSelect.addEventListener('change', () => {
                this.saveSettings();
                this.updateConnectionStatus();
            });
        }

        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => this.loadRundowns());
        }

        console.log('🔧 Property inspector elements initialized');
    }

    // Initialize with Stream Deck
    init(websocket, uuid, actionInfo) {
        console.log('🔧 Property inspector initializing...');
        
        this.websocket = websocket;
        this.uuid = uuid;
        this.actionInfo = actionInfo;

        // Load existing settings
        this.loadSettings();
        
        console.log('✅ Property inspector initialized');
    }

    // Load settings from Stream Deck
    loadSettings() {
        if (this.actionInfo && this.actionInfo.payload && this.actionInfo.payload.settings) {
            const settings = this.actionInfo.payload.settings;
            
            if (this.apiTokenInput && settings.apiToken) {
                this.apiTokenInput.value = settings.apiToken;
            }
            
            if (settings.rundownId) {
                this.selectedRundownId = settings.rundownId;
            }
            
            // Load rundowns if we have a token
            if (settings.apiToken) {
                this.testConnection();
                this.loadRundowns();
            }
        }
    }

    // Save settings to Stream Deck
    saveSettings() {
        if (!this.websocket) return;

        const settings = {
            apiToken: this.apiTokenInput ? this.apiTokenInput.value : '',
            rundownId: this.rundownSelect ? this.rundownSelect.value : ''
        };

        const payload = {
            event: 'setSettings',
            context: this.uuid,
            payload: settings
        };

        this.websocket.send(JSON.stringify(payload));
        console.log('💾 Settings saved:', settings);
    }

    // Test API connection
    async testConnection() {
        if (!this.apiTokenInput || !this.apiTokenInput.value) {
            this.updateConnectionStatus('Enter API token', 'error');
            return;
        }

        this.updateConnectionStatus('Testing connection...', 'testing');

        try {
            const response = await fetch(`${this.apiBase}/rundowns`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiTokenInput.value}`
                }
            });

            if (response.ok) {
                this.updateConnectionStatus('Connected ✅', 'success');
                return true;
            } else {
                this.updateConnectionStatus('Invalid token ❌', 'error');
                return false;
            }
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            this.updateConnectionStatus('Connection failed ❌', 'error');
            return false;
        }
    }

    // Load rundowns from API
    async loadRundowns() {
        if (!this.apiTokenInput || !this.apiTokenInput.value) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/rundowns`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiTokenInput.value}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.populateRundownSelect(data.rundowns || []);
                this.updateConnectionStatus('Rundowns loaded ✅', 'success');
            } else {
                this.updateConnectionStatus('Failed to load rundowns ❌', 'error');
            }
        } catch (error) {
            console.error('❌ Failed to load rundowns:', error);
            this.updateConnectionStatus('Failed to load rundowns ❌', 'error');
        }
    }

    // Populate rundown dropdown
    populateRundownSelect(rundowns) {
        if (!this.rundownSelect) return;

        // Clear existing options except the first one
        this.rundownSelect.innerHTML = '<option value="">Select a rundown...</option>';

        rundowns.forEach(rundown => {
            const option = document.createElement('option');
            option.value = rundown.id;
            option.textContent = rundown.title;
            
            // Select previously selected rundown
            if (rundown.id === this.selectedRundownId) {
                option.selected = true;
            }
            
            this.rundownSelect.appendChild(option);
        });

        console.log(`📋 Loaded ${rundowns.length} rundowns`);
    }

    // Update connection status display
    updateConnectionStatus(message = 'Not connected', type = 'default') {
        if (!this.connectionStatus) return;

        this.connectionStatus.textContent = message;
        
        // Remove existing status classes
        this.connectionStatus.classList.remove('status-success', 'status-error', 'status-testing');
        
        // Add appropriate class
        if (type === 'success') {
            this.connectionStatus.classList.add('status-success');
        } else if (type === 'error') {
            this.connectionStatus.classList.add('status-error');
        } else if (type === 'testing') {
            this.connectionStatus.classList.add('status-testing');
        }
    }
}

// Initialize property inspector
const propertyInspector = new CuerPropertyInspector();

// Stream Deck connection functions
function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
    const websocket = new WebSocket(`ws://127.0.0.1:${inPort}`);
    
    websocket.onopen = () => {
        const json = {
            event: inRegisterEvent,
            uuid: inPropertyInspectorUUID
        };
        websocket.send(JSON.stringify(json));
        
        // Initialize property inspector
        propertyInspector.init(websocket, inPropertyInspectorUUID, JSON.parse(inActionInfo));
    };
    
    websocket.onmessage = (event) => {
        const jsonObj = JSON.parse(event.data);
        console.log('📨 Property inspector received:', jsonObj.event);
    };
}

// Stream Deck SDK integration
if (typeof $PI !== 'undefined') {
    $PI.on('connected', (jsonObj) => {
        propertyInspector.init($PI.websocket, jsonObj.uuid, jsonObj.actionInfo);
    });
}