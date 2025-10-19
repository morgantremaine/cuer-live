import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Laptop sleep detection: only reload for CONFIRMED long sleeps (5+ minutes)
// Trust the ReconnectionCoordinator for all other scenarios
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
      const hiddenMinutes = Math.floor(hiddenDuration / 60000);
      const hiddenSeconds = Math.floor(hiddenDuration / 1000);
      
      console.log(`👁️ Tab visible again after ${hiddenSeconds} seconds`);
      
      // Only reload for CONFIRMED laptop sleep (5+ minutes hidden)
      // This avoids interfering with normal reconnection for brief issues
      if (hiddenDuration > 5 * 60 * 1000) {
        console.log(`💤 Long laptop sleep detected (${hiddenMinutes} minutes) - reloading for clean state`);
        window.location.reload();
      } else {
        console.log('✅ Short absence - letting reconnection system handle it naturally');
      }
      
      wasHidden = false;
    }
  });
  
  console.log('✅ Laptop sleep detector active (5-minute threshold)');
}

createRoot(document.getElementById("root")!).render(<App />);
