// Property Inspector JavaScript
class CuerPropertyInspector {
    constructor() {
        this.websocket = null;
        this.uuid = null;
        this.actionInfo = null;
        this.apiBase = 'https://khdiwrkgahsbjszlwnob.functions.supabase.co/functions/v1/stream-deck-api';
        this.authToken = null;
        this.currentUser = null;
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
        this.loginButton = document.getElementById('loginButton');
        this.userInfo = document.getElementById('userInfo');
        this.userEmail = document.getElementById('userEmail');
        this.logoutButton = document.getElementById('logoutButton');
        this.rundownSelect = document.getElementById('rundownSelect');
        this.refreshButton = document.getElementById('refreshButton');
        this.connectionStatus = document.getElementById('connectionStatus');

        // Add event listeners
        if (this.loginButton) {
            this.loginButton.addEventListener('click', () => this.handleLogin());
        }

        if (this.logoutButton) {
            this.logoutButton.addEventListener('click', () => this.handleLogout());
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

    // Handle login via browser popup
    async handleLogin() {
        this.updateConnectionStatus('Opening login window...', 'testing');
        
        try {
            // Open popup window for Cuer login
            const popup = window.open(
                'https://cuer.live/login?streamdeck=true',
                'cuer-login',
                'width=500,height=600,scrollbars=yes,resizable=yes'
            );

            // Listen for messages from the popup
            const messageHandler = (event) => {
                if (event.origin !== 'https://cuer.live') return;
                
                if (event.data.type === 'CUER_AUTH_SUCCESS') {
                    this.authToken = event.data.token;
                    this.currentUser = event.data.user;
                    
                    popup.close();
                    window.removeEventListener('message', messageHandler);
                    
                    this.onAuthSuccess();
                } else if (event.data.type === 'CUER_AUTH_ERROR') {
                    popup.close();
                    window.removeEventListener('message', messageHandler);
                    
                    this.updateConnectionStatus('Login failed ❌', 'error');
                }
            };

            window.addEventListener('message', messageHandler);

            // Check if popup was closed without auth
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    
                    if (!this.authToken) {
                        this.updateConnectionStatus('Login cancelled', 'error');
                    }
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Login error:', error);
            this.updateConnectionStatus('Login failed ❌', 'error');
        }
    }

    // Handle successful authentication
    onAuthSuccess() {
        console.log('✅ Authentication successful');
        
        // Update UI
        this.loginButton.style.display = 'none';
        this.userInfo.style.display = 'block';
        this.userEmail.textContent = this.currentUser.email;
        
        // Enable controls
        this.rundownSelect.disabled = false;
        this.refreshButton.disabled = false;
        
        // Load rundowns
        this.loadRundowns();
        this.saveSettings();
        
        this.updateConnectionStatus('Logged in ✅', 'success');
    }

    // Handle logout
    handleLogout() {
        this.authToken = null;
        this.currentUser = null;
        
        // Update UI
        this.loginButton.style.display = 'block';
        this.userInfo.style.display = 'none';
        
        // Disable controls
        this.rundownSelect.disabled = true;
        this.refreshButton.disabled = true;
        this.rundownSelect.innerHTML = '<option value="">Login first to see rundowns...</option>';
        
        this.saveSettings();
        this.updateConnectionStatus('Logged out', 'default');
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
            
            if (settings.authToken && settings.user) {
                this.authToken = settings.authToken;
                this.currentUser = settings.user;
                this.onAuthSuccess();
            }
            
            if (settings.rundownId) {
                this.selectedRundownId = settings.rundownId;
            }
        }
    }

    // Save settings to Stream Deck
    saveSettings() {
        if (!this.websocket) return;

        const settings = {
            authToken: this.authToken || '',
            user: this.currentUser || null,
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

    // Load rundowns from API
    async loadRundowns() {
        if (!this.authToken) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/rundowns`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
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