import * as CookieConsent from 'vanilla-cookieconsent';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

// Check if analytics is enabled
export const isAnalyticsEnabled = () => {
  return CookieConsent.acceptedCategory('analytics');
};

// Track page view
export const trackPageView = (path: string) => {
  if (!isAnalyticsEnabled() || !window.gtag) return;
  
  window.gtag('config', 'G-HZY1H01VZ4', {
    page_path: path,
  });
};

// Track custom event
export const trackEvent = (
  eventName: string,
  params?: Record<string, any>
) => {
  if (!isAnalyticsEnabled() || !window.gtag) return;
  
  window.gtag('event', eventName, params);
};

// Track user signup
export const trackSignup = (method: string) => {
  trackEvent('sign_up', {
    method,
  });
};

// Track user login
export const trackLogin = (method: string) => {
  trackEvent('login', {
    method,
  });
};

// Track button click
export const trackButtonClick = (buttonName: string, location: string) => {
  trackEvent('button_click', {
    button_name: buttonName,
    location,
  });
};

// Track feature usage
export const trackFeatureUsage = (featureName: string, action: string) => {
  trackEvent('feature_usage', {
    feature_name: featureName,
    action,
  });
};

// Set user ID for authenticated users
export const setUserId = (userId: string) => {
  if (!isAnalyticsEnabled() || !window.gtag) return;
  
  window.gtag('config', 'G-HZY1H01VZ4', {
    user_id: userId,
  });
};
