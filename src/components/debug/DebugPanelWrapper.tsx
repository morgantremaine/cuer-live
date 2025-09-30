import { RealtimeDebugPanel, realtimeDebugLogger } from './RealtimeDebugPanel';
import { useEffect } from 'react';

// Make debug logger globally available
if (typeof window !== 'undefined') {
  (window as any).realtimeDebugLogger = realtimeDebugLogger;
}

export const DebugPanelWrapper = () => {
  useEffect(() => {
    // Ensure logger is available globally
    if (typeof window !== 'undefined') {
      (window as any).realtimeDebugLogger = realtimeDebugLogger;
    }
  }, []);

  // Only show in development or if debug flag is set
  const isDevelopment = import.meta.env.DEV;
  const hasDebugFlag = typeof window !== 'undefined' && localStorage.getItem('enableRealtimeDebug') === '1';
  
  if (!isDevelopment && !hasDebugFlag) {
    return null;
  }

  return <RealtimeDebugPanel />;
};
