import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTawkTo } from '@/hooks/useTawkTo';

/**
 * Global Tawk.to Widget Manager
 * 
 * Manages Tawk.to chat widget visibility across the entire application.
 * Whitelist-based approach ensures widget only appears on designated pages.
 */
const TawkToGlobalManager = () => {
  const location = useLocation();

  // Whitelist of paths where Tawk.to should be visible
  const allowedPaths = [
    '/',      // Landing page
    '/help'   // Help page
  ];

  // Load the Tawk.to widget once globally
  useTawkTo({ showOnThisPage: true });

  // Manage widget visibility based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const shouldShow = allowedPaths.includes(currentPath);

    // Small delay to ensure Tawk_API is ready
    const timer = setTimeout(() => {
      if (shouldShow) {
        // Show widget on whitelisted pages
        if (window.Tawk_API?.showWidget) {
          window.Tawk_API.showWidget();
        }
      } else {
        // Hide widget on all other pages
        if (window.Tawk_API?.hideWidget) {
          window.Tawk_API.hideWidget();
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // This component doesn't render anything
  return null;
};

export default TawkToGlobalManager;
