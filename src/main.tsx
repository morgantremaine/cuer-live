import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { sleepDetector } from './services/sleepDetector'

// Start sleep detector to handle laptop wake scenarios
sleepDetector.start();

createRoot(document.getElementById("root")!).render(<App />);
