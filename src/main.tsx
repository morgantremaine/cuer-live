import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Detect laptop sleep using Page Visibility API (most reliable method)
if (typeof window !== 'undefined') {
  let lastHiddenTime = Date.now();
  let wasHidden = false;
  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Tab is hidden (laptop likely closed)
      wasHidden = true;
      lastHiddenTime = Date.now();
      console.log('👁️ Tab hidden at', new Date(lastHiddenTime).toLocaleTimeString());
    } else if (wasHidden) {
      // Tab is visible again (laptop opened)
      const hiddenDuration = Date.now() - lastHiddenTime;
      const hiddenMinutes = Math.floor(hiddenDuration / 60000);
      
      console.log(`👁️ Tab visible again after ${hiddenMinutes} minutes`);
      
      // If hidden for more than 10 minutes, assume laptop sleep and reload
      if (hiddenDuration > 10 * 60 * 1000) {
        console.log('💀 Long sleep detected - forcing immediate reload');
        
        // Small delay to let browser wake up
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
      
      wasHidden = false;
    }
  });
  
  // Also handle browser online/offline events for additional reliability
  let wasOffline = false;
  
  window.addEventListener('offline', () => {
    wasOffline = true;
    console.log('🌐 Browser detected offline');
  });
  
  window.addEventListener('online', () => {
    if (wasOffline) {
      console.log('🌐 Browser detected online after offline - reloading for clean state');
      wasOffline = false;
      
      // Give network 500ms to stabilize
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  });
  
  console.log('✅ Laptop sleep detector active (visibility + network events)');
}

createRoot(document.getElementById("root")!).render(<App />);
