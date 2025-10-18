import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global handler for network reconnection after disconnect
// When the 'online' event fires, TCP connections were severed - reload for clean state
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Network reconnected after disconnect - reloading for clean state');
    
    // Show brief notification
    import('sonner').then(({ toast }) => {
      toast.info('Network reconnected. Refreshing...', { duration: 1500 });
    });
    
    // Reload after brief delay for toast to show
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
