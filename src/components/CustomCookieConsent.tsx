import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface ConsentData {
  consentGiven: boolean;
  timestamp: string;
  preferences: CookiePreferences;
}

const STORAGE_KEY = 'cookie-consent-preferences';
const GA_ID = 'G-HZY1H01VZ4';
const TAWK_PROPERTY_ID = '6765f62caf5bfec1dbdc7aca';
const TAWK_WIDGET_ID = '1ifguimlq';

declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: Date;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export default function CustomCookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (stored) {
      try {
        const data: ConsentData = JSON.parse(stored);
        setPreferences(data.preferences);
        // Load scripts based on stored preferences
        if (data.preferences.analytics) loadGoogleAnalytics();
      } catch (e) {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }

    // Listen for custom event to open preferences
    const handleOpenPreferences = () => {
      setShowPreferences(true);
    };

    window.addEventListener('openCookiePreferences', handleOpenPreferences);
    return () => {
      window.removeEventListener('openCookiePreferences', handleOpenPreferences);
    };
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    const data: ConsentData = {
      consentGiven: true,
      timestamp: new Date().toISOString(),
      preferences: prefs,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setPreferences(prefs);

    // Dispatch event for Tawk.to to listen to consent changes
    window.dispatchEvent(new Event('tawkConsentChanged'));

    // Handle Google Analytics
    if (prefs.analytics) {
      loadGoogleAnalytics();
    } else {
      removeGoogleAnalytics();
    }
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
    setShowBanner(false);
  };

  const handleEssentialOnly = () => {
    const essentialOnly: CookiePreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    savePreferences(essentialOnly);
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
    setShowPreferences(false);
    setShowBanner(false);
  };


  const loadGoogleAnalytics = () => {
    if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_ID}"]`)) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer?.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  };

  const removeGoogleAnalytics = () => {
    const scripts = document.querySelectorAll(`script[src*="googletagmanager.com"]`);
    scripts.forEach(script => script.remove());
    
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
      });
    }
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-semibold">Cookie Settings</h3>
              <p className="text-xs text-muted-foreground">
                We use cookies to enhance your experience, analyze site traffic, and provide chat support. 
                <a href="/privacy" className="underline ml-1 hover:text-foreground">Learn more</a>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPreferences(true)}
              >
                Manage Preferences
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleEssentialOnly}
              >
                Essential Only
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
              >
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Dialog */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
            <DialogDescription>
              Choose which cookies you want to allow. You can change these settings at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Necessary Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Essential Cookies</Label>
                  <p className="text-sm text-muted-foreground">
                    Required for the website to function properly. These cannot be disabled.
                  </p>
                </div>
                <Switch checked disabled />
              </div>
            </div>

            {/* Functional Cookies */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="functional" className="text-base font-semibold">
                    Functional Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable enhanced functionality like live chat support and personalized features.
                  </p>
                </div>
                <Switch
                  id="functional"
                  checked={preferences.functional}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, functional: checked })
                  }
                />
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="analytics" className="text-base font-semibold">
                    Analytics Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Help us understand how visitors use our website to improve user experience.
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked })
                  }
                />
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="marketing" className="text-base font-semibold">
                    Marketing Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Used to track visitors across websites for advertising purposes.
                  </p>
                </div>
                <Switch
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, marketing: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreferences(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleSavePreferences} className="w-full sm:w-auto">
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
