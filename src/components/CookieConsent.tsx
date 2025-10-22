import { useEffect } from 'react';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import * as CookieConsent from 'vanilla-cookieconsent';
import './CookieConsentStyles.css';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export const CookieConsentComponent = () => {
  useEffect(() => {
    CookieConsent.run({
      categories: {
        necessary: {
          enabled: true,
          readOnly: true,
        },
        functional: {
          enabled: false,
        },
        analytics: {
          enabled: false,
        },
        marketing: {
          enabled: false,
        },
      },

      guiOptions: {
        consentModal: {
          layout: 'bar',
          position: 'bottom',
          flipButtons: false,
        },
      },

      language: {
        default: 'en',
        translations: {
          en: {
            consentModal: {
              title: '🍪 We use cookies',
              description:
                'We use cookies to improve your experience. Essential cookies are required for site functionality. Optional cookies help us provide support (chat) and understand usage. You can customize your preferences at any time.',
              acceptAllBtn: 'Accept All',
              acceptNecessaryBtn: 'Essential Only',
              showPreferencesBtn: 'Manage Preferences',
              footer: '<a href="/privacy">Privacy Policy</a> | <a href="/cookie-policy">Cookie Policy</a>',
            },
            preferencesModal: {
              title: 'Cookie Preferences',
              acceptAllBtn: 'Accept All',
              acceptNecessaryBtn: 'Essential Only',
              savePreferencesBtn: 'Save Preferences',
              closeIconLabel: 'Close',
              sections: [
                {
                  title: 'Cookie Usage',
                  description:
                    'We use cookies to enhance your browsing experience, provide support features, and analyze our traffic. You can choose which types of cookies to allow.',
                },
                {
                  title: 'Essential Cookies <span class="pm__badge">Always Enabled</span>',
                  description:
                    'These cookies are essential for the proper functioning of our website. They enable core features such as authentication, security, and session management. Without these cookies, the website cannot function properly.',
                  linkedCategory: 'necessary',
                },
                {
                  title: 'Functional Cookies',
                  description:
                    'These cookies enable enhanced functionality and personalization, such as live chat support and saving your preferences. They may be set by us or by third-party providers.',
                  linkedCategory: 'functional',
                },
                {
                  title: 'Analytics Cookies',
                  description:
                    'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our services and user experience.',
                  linkedCategory: 'analytics',
                },
                {
                  title: 'Marketing Cookies',
                  description:
                    'These cookies are used to track visitors across websites. The intention is to display ads that are relevant and engaging for the individual user.',
                  linkedCategory: 'marketing',
                },
              ],
            },
          },
        },
      },

      onConsent: ({ cookie }) => {
        console.log('Cookie consent given:', cookie.categories);
        
        // Load Tawk.to if functional cookies are accepted
        if (CookieConsent.acceptedCategory('functional')) {
          loadTawkTo();
        }

        // Load Google Analytics if analytics cookies are accepted
        if (CookieConsent.acceptedCategory('analytics')) {
          loadGoogleAnalytics();
        }
      },

      onChange: ({ cookie, changedCategories }) => {
        console.log('Cookie preferences changed:', changedCategories);

        // Handle Tawk.to based on functional consent
        if (changedCategories.includes('functional')) {
          if (CookieConsent.acceptedCategory('functional')) {
            loadTawkTo();
          } else {
            removeTawkTo();
          }
        }

        // Handle Google Analytics based on analytics consent
        if (changedCategories.includes('analytics')) {
          if (CookieConsent.acceptedCategory('analytics')) {
            loadGoogleAnalytics();
          } else {
            removeGoogleAnalytics();
          }
        }
      },
    });
  }, []);

  return null;
};

// Load Tawk.to chat widget
function loadTawkTo() {
  if (document.getElementById('tawk-script')) return;

  const script = document.createElement('script');
  script.id = 'tawk-script';
  script.async = true;
  script.src = 'https://embed.tawk.to/678fffb249e2fd8dfef73c74/1ii9o6uef';
  script.charset = 'UTF-8';
  script.setAttribute('crossorigin', '*');
  document.head.appendChild(script);
}

// Remove Tawk.to chat widget
function removeTawkTo() {
  const script = document.getElementById('tawk-script');
  if (script) {
    script.remove();
  }
  // Hide Tawk.to widget if it's already loaded
  const tawkWidget = document.getElementById('tawkchat-container');
  if (tawkWidget) {
    tawkWidget.style.display = 'none';
  }
}

// Load Google Analytics
function loadGoogleAnalytics() {
  const measurementId = 'G-HZY1H01VZ4';
  
  // Check if already loaded
  if (document.getElementById('ga-script')) return;

  // Create gtag.js script
  const gtagScript = document.createElement('script');
  gtagScript.id = 'ga-script';
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(gtagScript);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
}

// Remove Google Analytics
function removeGoogleAnalytics() {
  const script = document.getElementById('ga-script');
  if (script) {
    script.remove();
  }
  // Disable analytics
  if (window.gtag) {
    window.gtag('config', 'G-HZY1H01VZ4', {
      send_page_view: false,
    });
  }
}

export default CookieConsentComponent;
