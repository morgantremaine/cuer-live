
import React from 'react';
import { Wifi, WifiOff, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealtimeStatusIndicatorProps {
  isConnected: boolean;
  isProcessingUpdate: boolean;
  className?: string;
}

const RealtimeStatusIndicator = ({ 
  isConnected, 
  isProcessingUpdate, 
  className 
}: RealtimeStatusIndicatorProps) => {
  const getStatusInfo = () => {
    if (isProcessingUpdate) {
      return {
        icon: Users,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        title: 'Syncing changes from teammate...',
        label: 'Syncing'
      };
    } else if (isConnected) {
      return {
        icon: Wifi,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        title: 'Real-time collaboration active',
        label: 'Live'
      };
    } else {
      return {
        icon: WifiOff,
        color: 'text-gray-500',
        bgColor: 'bg-gray-500/10',
        title: 'Real-time collaboration disconnected',
        label: 'Offline'
      };
    }
  };

  const { icon: Icon, color, bgColor, title, label } = getStatusInfo();

  return (
    <div 
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium transition-all',
        bgColor,
        color,
        className
      )}
      title={title}
    >
      <Icon className={cn('h-3 w-3', isProcessingUpdate && 'animate-pulse')} />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
};

export default RealtimeStatusIndicator;
