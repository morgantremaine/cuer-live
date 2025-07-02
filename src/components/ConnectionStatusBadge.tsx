
import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        icon: Loader2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        label: 'Syncing...',
        title: 'Syncing changes with team'
      };
    } else if (isConnected) {
      return {
        icon: Wifi,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        label: 'Live',
        title: 'Connected - real-time collaboration active'
      };
    } else {
      return {
        icon: WifiOff,
        color: 'text-gray-500',
        bgColor: 'bg-gray-500/10',
        label: 'Offline',
        title: 'Disconnected - changes will not sync in real-time'
      };
    }
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
      <Icon 
        className={cn(
          'h-3 w-3', 
          isProcessing && 'animate-spin'
        )} 
      />
      {showLabel && (
        <span className="hidden sm:inline">{label}</span>
      )}
    </div>
  );
};

export default ConnectionStatusBadge;
