
import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedWifiIcon from './AnimatedWifiIcon';

interface ConnectionStatusBadgeProps {
  isConnected: boolean;
  isProcessing?: boolean;
  className?: string;
  showLabel?: boolean;
}

const ConnectionStatusBadge = ({ 
  isConnected, 
  isProcessing = false, 
  className,
  showLabel = true 
}: ConnectionStatusBadgeProps) => {
  const getStatusConfig = () => {
    if (isProcessing) {
      return {
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/20 border border-blue-500/30',
        label: 'Syncing...',
        title: 'Syncing changes with team',
        useAnimated: true
      };
    } else if (isConnected) {
      return {
        icon: Wifi,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/15 border border-emerald-500/25',
        label: 'Live',
        title: 'Connected - real-time collaboration active',
        useAnimated: false
      };
    } else {
      return {
        icon: WifiOff,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10 border border-red-500/20',
        label: 'Offline',
        title: 'Disconnected - changes will not sync in real-time',
        useAnimated: false
      };
    }
  };

  const { icon: Icon, color, bgColor, label, title, useAnimated } = getStatusConfig();

  return (
    <div 
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300',
        bgColor,
        color,
        className
      )}
      title={title}
    >
      {useAnimated ? (
        <AnimatedWifiIcon 
          className={cn(color, "drop-shadow-sm")}
          isAnimating={true}
        />
      ) : Icon ? (
        <Icon className={cn("h-3 w-3 drop-shadow-sm", isConnected && "animate-pulse")} />
      ) : null}
      {showLabel && (
        <span className="hidden sm:inline font-semibold">{label}</span>
      )}
    </div>
  );
};

export default ConnectionStatusBadge;
