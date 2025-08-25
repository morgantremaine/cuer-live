import React from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedWifiIcon from './AnimatedWifiIcon';
import { useRealtimeConnection } from './RealtimeConnectionProvider';

interface RealtimeConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

const RealtimeConnectionStatus = ({ 
  className,
  showLabel = true,
  compact = false
}: RealtimeConnectionStatusProps) => {
  const { isConnected, isProcessingUpdate } = useRealtimeConnection();

  const getStatusConfig = () => {
    if (isProcessingUpdate) {
      return {
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        label: compact ? 'Sync' : 'Syncing...',
        title: 'Syncing changes with team',
        pulse: true
      };
    } else if (isConnected) {
      return {
        icon: Wifi,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        label: 'Live',
        title: 'Connected - real-time collaboration active',
        pulse: false
      };
    } else {
      return {
        icon: WifiOff,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        label: 'Offline',
        title: 'Disconnected - changes may not sync in real-time',
        pulse: false
      };
    }
  };

  const { icon: Icon, color, bgColor, borderColor, label, title, pulse } = getStatusConfig();

  return (
    <div 
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all border',
        bgColor,
        borderColor,
        color,
        pulse && 'animate-pulse',
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
        className
      )}
      title={title}
    >
      {isProcessingUpdate ? (
        <AnimatedWifiIcon 
          className={cn('h-3 w-3', color)}
          isAnimating={true}
        />
      ) : Icon ? (
        <Icon className="h-3 w-3" />
      ) : null}
      {showLabel && !compact && (
        <span className="hidden sm:inline">{label}</span>
      )}
      {showLabel && compact && (
        <span className="text-xs">{label}</span>
      )}
    </div>
  );
};

export default RealtimeConnectionStatus;