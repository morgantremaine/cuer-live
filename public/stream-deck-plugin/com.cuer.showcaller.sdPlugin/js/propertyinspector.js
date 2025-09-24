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

        console.log('🔧 Elements found:', {
            loginButton: !!this.loginButton,
            userInfo: !!this.userInfo,
            userEmail: !!this.userEmail,
            logoutButton: !!this.logoutButton,
            rundownSelect: !!this.rundownSelect,
            refreshButton: !!this.refreshButton,
            connectionStatus: !!this.connectionStatus
        });

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

        // Attempt to restore auth if we have pending restoration
        if (this.pendingAuthRestore || (this.authToken && this.currentUser)) {
            console.log('🔧 Elements initialized, attempting auth restoration...');
            this.attemptAuthRestore();
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
        console.log('🚪 Logging out and clearing auth state...');
        
        this.authToken = null;
        this.currentUser = null;
        this.pendingAuthRestore = false;
        
        // Update UI
        this.loginButton.style.display = 'block';
        this.userInfo.style.display = 'none';
        
        // Disable controls
        this.rundownSelect.disabled = true;
        this.refreshButton.disabled = true;
        this.rundownSelect.innerHTML = '<option value="">Login first to see rundowns...</option>';
        
        this.saveSettings();
        this.updateConnectionStatus('Logged out - please login again', 'error');
        
        console.log('✅ Logout complete and settings saved');
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
        console.log('🔄 Loading settings from Stream Deck...');
        console.log('📋 ActionInfo:', this.actionInfo);
        
        if (this.actionInfo && this.actionInfo.payload && this.actionInfo.payload.settings) {
            const settings = this.actionInfo.payload.settings;
            console.log('⚙️ Found settings:', settings);
            
            if (settings.authToken && settings.user) {
                console.log('🔑 Restoring authentication from settings...');
                this.authToken = settings.authToken;
                this.currentUser = settings.user;
                
                // Try to restore immediately if elements are ready, otherwise defer
                this.attemptAuthRestore();
            } else {
                console.log('❌ No valid auth token or user in settings');
            }
            
            if (settings.rundownId) {
                console.log('📋 Restoring rundown selection:', settings.rundownId);
                this.selectedRundownId = settings.rundownId;
                // Update dropdown if it exists
                if (this.rundownSelect && this.rundownSelect.value !== settings.rundownId) {
                    this.rundownSelect.value = settings.rundownId;
                }
            }
        } else {
            console.log('❌ No settings found in actionInfo');
        }
    }

    // Helper method to attempt auth restoration
    attemptAuthRestore() {
        if (this.authToken && this.currentUser) {
            if (this.loginButton && this.userInfo) {
                console.log('✅ Elements ready, restoring authentication now');
                this.onAuthSuccess();
                this.pendingAuthRestore = false;
            } else {
                console.log('⏳ Elements not ready, marking for pending restoration');
                this.pendingAuthRestore = true;
            }
        }
    }

    // Save settings to Stream Deck
    saveSettings() {
        if (!this.websocket) return;

        const settings = {
            authToken: this.authToken || '',
            user: this.currentUser || null,
            rundownId: this.rundownSelect ? this.rundownSelect.value : (this.selectedRundownId || '')
        };

        const payload = {
            event: 'setSettings',
            context: this.uuid,
            payload: settings
        };

        this.websocket.send(JSON.stringify(payload));
        console.log('💾 Settings saved to Stream Deck:', settings);
        console.log('💾 Auth token length:', settings.authToken ? settings.authToken.length : 'none');
    }

    // Load rundowns from API
    async loadRundowns() {
        if (!this.authToken) {
            console.log('❌ No auth token available');
            return;
        }

        console.log('🔄 Loading rundowns with token:', this.authToken?.substring(0, 20) + '...');
        console.log('🌐 API URL:', `${this.apiBase}/rundowns`);

        try {
            const response = await fetch(`${this.apiBase}/rundowns`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Rundowns data:', data);
                this.populateRundownSelect(data.rundowns || []);
                this.updateConnectionStatus('Rundowns loaded ✅', 'success');
            } else {
                const errorText = await response.text();
                console.error('❌ Response not OK:', response.status, errorText);
                
                // Handle authentication errors specifically
                if (response.status === 401) {
                    console.log('🔑 Authentication failed, clearing stored auth');
                    this.handleLogout();
                    this.updateConnectionStatus('Please login again ❌', 'error');
                } else {
                    this.updateConnectionStatus(`Failed to load rundowns (${response.status}) ❌`, 'error');
                }
            }
        } catch (error) {
            console.error('❌ Failed to load rundowns:', error);
            this.updateConnectionStatus('Network error loading rundowns ❌', 'error');
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
        console.log('🎛️ Stream Deck SDK connected to property inspector');
        console.log('🎛️ Connection data:', jsonObj);
        
        propertyInspector.init($PI.websocket, jsonObj.uuid, jsonObj.actionInfo);
        
        // Additional debugging for auth state
        console.log('🔑 Auth state after SDK init:', {
            hasToken: !!propertyInspector.authToken,
            hasUser: !!propertyInspector.currentUser,
            tokenLength: propertyInspector.authToken ? propertyInspector.authToken.length : 0
        });
    });
}