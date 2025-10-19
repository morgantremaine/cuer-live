import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Smart laptop sleep detection: check connection health after tab becomes visible
if (typeof window !== 'undefined') {
  let wasHidden = false;
  let hiddenStartTime = 0;
  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Tab just became hidden
      wasHidden = true;
      hiddenStartTime = Date.now();
      console.log('👁️ Tab hidden');
    } else if (wasHidden) {
      // Tab just became visible again
      const hiddenDuration = Date.now() - hiddenStartTime;
      const hiddenSeconds = Math.floor(hiddenDuration / 1000);
      
      console.log(`👁️ Tab visible again after ${hiddenSeconds} seconds`);
      
      // Check if WebSocket connections are dead (indicating laptop sleep)
      // After ANY hidden period, check connection health
      import('@/integrations/supabase/client').then(({ supabase }) => {
        const realtimeClient = (supabase as any).realtime;
        
        if (realtimeClient) {
          // Give connections 200ms to wake up naturally
          setTimeout(() => {
            const channels = realtimeClient.channels || [];
            const hasErroredChannels = channels.some((ch: any) => 
              ch.state === 'CHANNEL_ERROR' || ch.state === 'errored' || ch.state === 'closed'
            );
            
            if (hasErroredChannels) {
              console.log('💀 Dead connections detected after wake - reloading immediately');
              window.location.reload();
            } else {
              console.log('✅ Connections healthy after wake - no reload needed');
            }
          }, 200);
        }
      });
      
      wasHidden = false;
    }
  });
  
  console.log('✅ Smart laptop sleep detector active');
}

createRoot(document.getElementById("root")!).render(<App />);
