import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface UseTawkToOptions {
  showOnThisPage: boolean;
  propertyId?: string;
  widgetId?: string;
}

const DEFAULT_PROPERTY_ID = '68cfa27c4ad9d919216ba7a7';
const DEFAULT_WIDGET_ID = '1j5lh5dkg';
const STORAGE_KEY = 'cookie-consent-preferences';

declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: Date;
  }
}

export const useTawkTo = ({
  showOnThisPage,
  propertyId = DEFAULT_PROPERTY_ID,
  widgetId = DEFAULT_WIDGET_ID
}: UseTawkToOptions) => {
  const location = useLocation();

  useEffect(() => {
    const checkConsent = (): boolean => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          return data.preferences?.functional === true;
        }
      } catch (error) {
        console.error('Error reading cookie consent:', error);
      }
      return false;
    };

    const loadScript = () => {
      if (document.getElementById('tawk-script')) return;

      const script = document.createElement('script');
      script.id = 'tawk-script';
      script.type = 'text/javascript';
      script.async = true;
      script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');
      
      window.Tawk_LoadStart = new Date();
      document.body.appendChild(script);
    };

    const showWidget = () => {
      if (window.Tawk_API?.showWidget) {
        window.Tawk_API.showWidget();
      } else {
        // If API not ready, set onLoad callback
        window.Tawk_API = window.Tawk_API || {};
        window.Tawk_API.onLoad = () => {
          if (window.Tawk_API?.showWidget) {
            window.Tawk_API.showWidget();
          }
        };
      }
    };

    const hideWidget = () => {
      if (window.Tawk_API?.hideWidget) {
        window.Tawk_API.hideWidget();
      }
    };

    const updateWidgetVisibility = () => {
      const hasConsent = checkConsent();
      const shouldShow = showOnThisPage && hasConsent;

      if (shouldShow) {
        // Load script if not loaded
        if (!document.getElementById('tawk-script')) {
          loadScript();
        }
        // Show widget
        showWidget();
      } else {
        // Hide widget
        hideWidget();
      }
    };

    // Initial check
    updateWidgetVisibility();

    // Listen for consent changes
    const handleConsentChange = () => {
      updateWidgetVisibility();
    };

    window.addEventListener('tawkConsentChanged', handleConsentChange);

    // Cleanup on unmount or route change
    return () => {
      window.removeEventListener('tawkConsentChanged', handleConsentChange);
      // Always hide widget when leaving the page (component unmounts)
      hideWidget();
    };
  }, [location.pathname, showOnThisPage, propertyId, widgetId]);
};
