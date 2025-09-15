import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as Y from "https://esm.sh/yjs@13.6.10";

interface LocalSession {
  id: string;
  pin: string;
  name: string;
  createdAt: number;
  clients: Set<WebSocket>;
  ydoc: Y.Doc;
  allowedIPs: Set<string>;
  teamId?: string;
  rundownId?: string;
}

// Store active sessions in memory
const activeSessions = new Map<string, LocalSession>();

// Generate 6-digit PIN
function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get client IP from request
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

// Validate session PIN and IP
function validateAccess(session: LocalSession, pin: string, clientIP: string): boolean {
  if (session.pin !== pin) {
    return false;
  }
  
  // Allow localhost and private IP ranges by default
  if (clientIP === 'unknown' || 
      clientIP.startsWith('127.') || 
      clientIP.startsWith('192.168.') || 
      clientIP.startsWith('10.') ||
      clientIP.startsWith('172.')) {
    return true;
  }
  
  return session.allowedIPs.has(clientIP);
}

// Broadcast Yjs update to all clients in session
function broadcastUpdate(session: LocalSession, update: Uint8Array, excludeClient?: WebSocket) {
  const message = JSON.stringify({
    type: 'yjs-update',
    update: Array.from(update)
  });
  
  session.clients.forEach(client => {
    if (client !== excludeClient && client.readyState === WebSocket.READY_STATE_OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Failed to send update to client:', error);
        session.clients.delete(client);
      }
    }
  });
}

// Handle WebSocket connections
async function handleWebSocket(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session');
  const pin = url.searchParams.get('pin');
  const rundownId = url.searchParams.get('rundown');
  
  if (!sessionId || !pin) {
    return new Response('Missing session ID or PIN', { status: 400 });
  }
  
  const session = activeSessions.get(sessionId);
  if (!session) {
    return new Response('Session not found', { status: 404 });
  }
  
  const clientIP = getClientIP(req);
  if (!validateAccess(session, pin, clientIP)) {
    return new Response('Access denied', { status: 403 });
  }
  
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  socket.onopen = () => {
    console.log(`Client connected to session ${sessionId} from ${clientIP}`);
    session.clients.add(socket);
    
    // Send current document state to new client
    const state = Y.encodeStateAsUpdate(session.ydoc);
    socket.send(JSON.stringify({
      type: 'yjs-sync',
      state: Array.from(state)
    }));
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'yjs-update' && data.update) {
        // Apply update to session document
        const update = new Uint8Array(data.update);
        Y.applyUpdate(session.ydoc, update);
        
        // Broadcast to other clients
        broadcastUpdate(session, update, socket);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  };
  
  socket.onclose = () => {
    console.log(`Client disconnected from session ${sessionId}`);
    session.clients.delete(socket);
  };
  
  socket.onerror = (error) => {
    console.error(`WebSocket error in session ${sessionId}:`, error);
    session.clients.delete(socket);
  };
  
  return response;
}

// HTTP API endpoints
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const url = new URL(req.url);
  
  // WebSocket upgrade for real-time sync
  if (req.headers.get('upgrade') === 'websocket') {
    const response = await handleWebSocket(req);
    return response;
  }
  
  // Health check endpoint
  if (url.pathname === '/health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      name: 'Cuer Local Host',
      version: '1.0.0',
      sessions: activeSessions.size,
      timestamp: Date.now()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Create new session
  if (url.pathname === '/sessions' && req.method === 'POST') {
    try {
      const body = await req.json();
      const { name, teamId, rundownId, allowedIPs = [] } = body;
      
      const sessionId = crypto.randomUUID();
      const pin = generatePin();
      const ydoc = new Y.Doc();
      
      const session: LocalSession = {
        id: sessionId,
        pin,
        name: name || 'Cuer Session',
        createdAt: Date.now(),
        clients: new Set(),
        ydoc,
        allowedIPs: new Set(allowedIPs),
        teamId,
        rundownId
      };
      
      activeSessions.set(sessionId, session);
      
      // Clean up old sessions (older than 24 hours)
      const cutoff = Date.now() - (24 * 60 * 60 * 1000);
      for (const [id, sess] of activeSessions) {
        if (sess.createdAt < cutoff) {
          sess.clients.forEach(client => client.close());
          activeSessions.delete(id);
        }
      }
      
      return new Response(JSON.stringify({
        sessionId,
        pin,
        name: session.name,
        websocketUrl: `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/websocket?session=${sessionId}&pin=${pin}&rundown=${rundownId}`,
        qrData: {
          type: 'cuer-session',
          sessionId,
          pin,
          host: url.host,
          rundownId
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to create session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Get session info
  if (url.pathname.startsWith('/sessions/') && req.method === 'GET') {
    const sessionId = url.pathname.split('/')[2];
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      id: session.id,
      name: session.name,
      createdAt: session.createdAt,
      clientCount: session.clients.size,
      teamId: session.teamId,
      rundownId: session.rundownId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // End session
  if (url.pathname.startsWith('/sessions/') && req.method === 'DELETE') {
    const sessionId = url.pathname.split('/')[2];
    const session = activeSessions.get(sessionId);
    
    if (session) {
      session.clients.forEach(client => client.close());
      activeSessions.delete(sessionId);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // List active sessions (for discovery)
  if (url.pathname === '/discover' && req.method === 'GET') {
    const sessions = Array.from(activeSessions.values()).map(session => ({
      id: session.id,
      name: session.name,
      clientCount: session.clients.size,
      createdAt: session.createdAt
    }));
    
    return new Response(JSON.stringify({
      host: {
        name: 'Cuer Local Host',
        version: '1.0.0',
        capabilities: ['yjs-sync', 'session-pins', 'ip-allowlist']
      },
      sessions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Not Found', { status: 404, headers: corsHeaders });
});