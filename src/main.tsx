import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Detect laptop sleep by monitoring for simultaneous channel errors
if (typeof window !== 'undefined') {
  import('@/integrations/supabase/client').then(({ supabase }) => {
    const realtimeClient = (supabase as any).realtime;
    
    if (realtimeClient) {
      const channelErrors = new Set<string>();
      let cascadeTimer: NodeJS.Timeout | null = null;
      
      // Poll every 100ms to catch errors immediately (faster than reconnection logic)
      const checkInterval = setInterval(() => {
        const channels = realtimeClient.channels || [];
        
        // Count how many channels are in error state RIGHT NOW
        let errorCount = 0;
        channels.forEach((channel: any) => {
          if (channel.state === 'CHANNEL_ERROR' || channel.state === 'errored') {
            errorCount++;
            channelErrors.add(channel.topic);
          }
        });
        
        // If 2+ channels are in error state simultaneously = laptop sleep
        if (errorCount >= 2) {
          console.log('💀 Laptop sleep detected (multiple simultaneous channel errors) - reloading', {
            errorCount,
            channels: Array.from(channelErrors)
          });
          
          clearInterval(checkInterval);
          if (cascadeTimer) clearTimeout(cascadeTimer);
          
          // Reload immediately, no toast (too slow)
          window.location.reload();
        }
        
        // Clear the set every 2 seconds to prevent stale data
        if (!cascadeTimer) {
          cascadeTimer = setTimeout(() => {
            channelErrors.clear();
            cascadeTimer = null;
          }, 2000);
        }
      }, 100); // Check 10x per second - fast enough to beat reconnection logic
      
      console.log('✅ Laptop sleep detector active');
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
