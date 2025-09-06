import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { useAppUpdateNotifications } from '@/hooks/useAppUpdateNotifications';

const AppUpdateNotification = () => {
  const { notification, isVisible, dismissNotification, refreshApp } = useAppUpdateNotifications();

  if (!isVisible || !notification) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-2">
      <Alert className="border-primary bg-primary/5 shadow-lg">
        <RefreshCw className="h-4 w-4 text-primary" />
        <div className="flex items-center justify-between w-full">
          <div className="flex-1">
            <AlertTitle className="text-primary font-semibold">
              {notification.title}
            </AlertTitle>
            {notification.message && (
              <AlertDescription className="text-muted-foreground mt-1">
                {notification.message}
              </AlertDescription>
            )}
          </div>
          <button
            onClick={dismissNotification}
            className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button 
            onClick={refreshApp}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Button 
            onClick={dismissNotification}
            variant="outline" 
            size="sm"
          >
            Later
          </Button>
        </div>
      </Alert>
    </div>
  );
};

export default AppUpdateNotification;