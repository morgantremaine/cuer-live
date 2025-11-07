
import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedWifiIcon from './AnimatedWifiIcon';

interface ConnectionStatusBadgeProps {
  isConnected: boolean;
  isProcessing?: boolean;
  isDegraded?: boolean;
  isReconnecting?: boolean;
  className?: string;
  showLabel?: boolean;
}

const ConnectionStatusBadge = ({ 
  isConnected, 
  isProcessing = false,
  isDegraded = false,
  isReconnecting = false,
  className,
  showLabel = true 
}: ConnectionStatusBadgeProps) => {
  const getStatusConfig = () => {
    // Priority 1: Check browser offline status first
    if (!navigator.onLine) {
      return {
        icon: WifiOff,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: 'Offline',
        title: 'No internet connection'
      };
    }
    
    // Priority 2: Processing/Syncing state (highest priority when active)
    if (isProcessing) {
      return {
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        label: 'Syncing...',
        title: 'Syncing changes with team'
      };
    }
    
    // Priority 3: Reconnecting
    if (isReconnecting) {
      return {
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        label: 'Reconnecting...',
        title: 'Reconnecting to server...'
      };
    }
    
    // Priority 4: Degraded connection
    if (isConnected && isDegraded) {
      return {
        icon: Wifi,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        label: 'Poor',
        title: 'Poor connection - slower sync'
      };
    }
    
    // Priority 5: Connected
    if (isConnected) {
      return {
        icon: Wifi,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        label: 'Live',
        title: 'Connected - real-time collaboration active'
      };
    }
    
    // Default: Offline
    return {
      icon: WifiOff,
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
      label: 'Offline',
      title: 'Disconnected - changes will not sync in real-time'
    };
  };

  const { icon: Icon, color, bgColor, label, title } = getStatusConfig();

  return (
    <div 
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all',
        bgColor,
        color,
        className
      )}
      title={title}
    >
      {isProcessing ? (
        <AnimatedWifiIcon 
          className={color}
          isAnimating={true}
        />
      ) : Icon ? (
        <Icon className="h-3 w-3" />
      ) : null}
      {showLabel && (
        <span className="hidden sm:inline">{label}</span>
      )}
    </div>
  );
};

export default ConnectionStatusBadge;
