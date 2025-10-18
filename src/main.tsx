import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Detect laptop sleep by monitoring for cascading channel errors
if (typeof window !== 'undefined') {
  import('@/integrations/supabase/client').then(({ supabase }) => {
    const realtimeClient = (supabase as any).realtime;
    
    if (realtimeClient) {
      // Track channel errors to detect cascading failures (laptop sleep signature)
      const channelErrors = new Map<string, number>();
      
      // Monitor all channels for errors
      const checkInterval = setInterval(() => {
        const channels = realtimeClient.channels || [];
        
        channels.forEach((channel: any) => {
          const status = channel.state;
          const topic = channel.topic;
          
          // Detect CHANNEL_ERROR state
          if (status === 'CHANNEL_ERROR' || status === 'errored') {
            const now = Date.now();
            const lastError = channelErrors.get(topic);
            
            // Only count if this is a new error (not the same one)
            if (!lastError || now - lastError > 1000) {
              channelErrors.set(topic, now);
              
              // Clear old errors (>2 seconds)
              const cutoff = now - 2000;
              for (const [key, time] of channelErrors.entries()) {
                if (time < cutoff) {
                  channelErrors.delete(key);
                }
              }
              
              // If 2+ channels errored within 2 seconds = laptop sleep cascade
              if (channelErrors.size >= 2) {
                console.log('💀 Multiple channel errors detected (laptop sleep) - reloading', {
                  errorCount: channelErrors.size,
                  channels: Array.from(channelErrors.keys())
                });
                
                clearInterval(checkInterval);
                
                import('sonner').then(({ toast }) => {
                  toast.info('Connection lost. Refreshing...', { duration: 1500 });
                });
                
                setTimeout(() => {
                  window.location.reload();
                }, 1500);
              }
            }
          }
        });
      }, 500); // Check every 500ms
      
      console.log('✅ Channel error cascade monitor installed');
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
