import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConnectionState } from '@/hooks/useConnectionState';
import { cn } from '@/lib/utils';

interface ConnectionBannerProps {
  className?: string;
}

const ConnectionBanner = ({ className }: ConnectionBannerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const connectionState = useConnectionState();

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const status = connectionState.status;
      
      let shouldShow = false;

      if (status === 'disconnected') {
        shouldShow = true;
      } else if (status === 'syncing') {
        shouldShow = true;
      } else {
        // Connection healthy - hide banner
        shouldShow = false;
        setIsDismissed(false); // Reset dismiss state when healthy
      }
      
      // Only show if not manually dismissed
      if (shouldShow && !isDismissed) {
        setIsVisible(true);
      } else if (!shouldShow) {
        setIsVisible(false);
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(checkInterval);
  }, [isDismissed, connectionState.status]);

  const handleReloadNow = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const bannerConfig = {
    syncing: {
      bgColor: 'bg-yellow-500/20 border-yellow-500/30',
      textColor: 'text-yellow-200',
      icon: RefreshCw,
      iconClass: 'animate-spin',
      title: 'Syncing...',
      message: 'Refreshing rundown state',
      showReload: false,
    },
    disconnected: {
      bgColor: 'bg-red-500/20 border-red-500/30',
      textColor: 'text-red-200',
      icon: WifiOff,
      iconClass: '',
      title: 'Connection Problems',
      message: 'Please reload the page to restore connection',
      showReload: true,
    },
  };

  const config = bannerConfig[connectionState.status === 'syncing' ? 'syncing' : 'disconnected'];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-sm',
        'animate-in slide-in-from-top duration-300',
        config.bgColor,
        className
      )}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Status Info */}
          <div className="flex items-center gap-3 flex-1">
            <Icon className={cn('h-5 w-5', config.textColor, config.iconClass)} />
            <div className="flex-1">
              <div className={cn('font-semibold text-sm', config.textColor)}>
                {config.title}
              </div>
              <div className={cn('text-xs opacity-90', config.textColor)}>
                {config.message}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {config.showReload && (
              <Button
                size="sm"
                variant="default"
                onClick={handleReloadNow}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Reload Now
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className={cn('hover:bg-white/10', config.textColor)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionBanner;
