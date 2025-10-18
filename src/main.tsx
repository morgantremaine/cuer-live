import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Monitor Supabase WebSocket for abnormal closures (laptop sleep, network loss)
if (typeof window !== 'undefined') {
  import('@/integrations/supabase/client').then(({ supabase }) => {
    // Access the internal realtime WebSocket connection
    const realtimeClient = (supabase as any).realtime;
    
    if (realtimeClient) {
      // Wait for connection to be established
      const setupMonitor = () => {
        const conn = realtimeClient.conn;
        
        if (conn && conn.conn) {
          // Store original onclose handler
          const originalOnClose = conn.conn.onclose;
          
          // Override with our monitoring version
          conn.conn.onclose = function(event: CloseEvent) {
            console.log('🔌 WebSocket closed:', {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean
            });
            
            // Detect abnormal closures (laptop sleep, network loss)
            // Code 1006 = abnormal closure (no close frame received)
            // Code 1005 = no status code (also abnormal)
            // !wasClean = connection lost unexpectedly
            if (event.code === 1006 || event.code === 1005 || !event.wasClean) {
              console.log('💀 Abnormal WebSocket closure detected (likely laptop sleep) - reloading');
              
              // Show notification
              import('sonner').then(({ toast }) => {
                toast.info('Connection lost. Refreshing...', { duration: 1500 });
              });
              
              // Reload for clean state
              setTimeout(() => {
                window.location.reload();
              }, 1500);
              
              return; // Don't call original handler
            }
            
            // Normal closure (user navigation, manual disconnect) - call original handler
            console.log('✅ Normal WebSocket closure');
            if (originalOnClose) {
              originalOnClose.call(this, event);
            }
          };
          
          console.log('✅ WebSocket close monitor installed');
        }
      };
      
      // Try to setup monitor immediately
      setupMonitor();
      
      // Also setup monitor after any reconnection
      const originalConnect = realtimeClient.connect;
      if (originalConnect) {
        realtimeClient.connect = function() {
          const result = originalConnect.call(this);
          setTimeout(setupMonitor, 100); // Give connection time to establish
          return result;
        };
      }
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
