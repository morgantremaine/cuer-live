import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './services/visibilitySync'

// Visibility sync service is initialized automatically and will trigger
// immediate data refresh when tab becomes visible after being hidden.
// This prevents stale data issues without disruptive page reloads.
console.log('✅ Visibility sync service active - immediate data refresh on tab focus');

createRoot(document.getElementById("root")!).render(<App />);
