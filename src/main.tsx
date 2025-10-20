import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Laptop sleep detection: reload immediately if connections died during sleep
// Avoids yellow "reconnecting" icon by reloading to fresh green state
if (typeof window !== 'undefined') {
  let wasHidden = false;
  let hiddenStartTime = 0;
  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      wasHidden = true;
      hiddenStartTime = Date.now();
      console.log('👁️ Tab hidden');
    } else if (wasHidden) {
      const hiddenDuration = Date.now() - hiddenStartTime;
      const hiddenSeconds = Math.floor(hiddenDuration / 1000);
      
      console.log(`👁️ Tab visible again after ${hiddenSeconds} seconds`);
      
      // Check if connections died during hidden period (indicates laptop sleep)
      import('@/integrations/supabase/client').then(({ supabase }) => {
        // Give channels 100ms to wake naturally (for quick tab switches)
        setTimeout(() => {
          const realtimeClient = (supabase as any).realtime;
          
          if (realtimeClient) {
            const channels = realtimeClient.channels || [];
            const hasDeadChannels = channels.some((ch: any) => 
              ch.state === 'CHANNEL_ERROR' || 
              ch.state === 'errored' || 
              ch.state === 'closed'
            );
            
            if (hasDeadChannels) {
              console.log(`💤 Laptop sleep detected - dead channels found after ${hiddenSeconds}s - reloading for instant connection`);
              window.location.reload();
            } else {
              console.log('✅ Channels still alive - was just a tab switch, no reload needed');
            }
          }
        }, 100);
      });
      
      wasHidden = false;
    }
  });
  
  console.log('✅ Laptop sleep detector active (instant reload on wake)');
}

createRoot(document.getElementById("root")!).render(<App />);
