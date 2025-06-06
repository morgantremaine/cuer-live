
import React from 'react';
import { Wifi, WifiOff, Users, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RealtimeStatusProps {
  isConnected: boolean;
  hasPendingChanges: boolean;
  isEditing: boolean;
}

const RealtimeStatus = ({ isConnected, hasPendingChanges, isEditing }: RealtimeStatusProps) => {
  const getStatusColor = () => {
    if (!isConnected) return 'destructive';
    if (hasPendingChanges) return 'secondary';
    return 'default';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Offline';
    if (hasPendingChanges) return 'Syncing...';
    return 'Live';
  };

  const getStatusIcon = () => {
    if (!isConnected) return <WifiOff className="h-3 w-3" />;
    if (hasPendingChanges) return <Clock className="h-3 w-3" />;
    return <Wifi className="h-3 w-3" />;
  };

  const getTooltipText = () => {
    if (!isConnected) return 'Not connected to real-time collaboration';
    if (hasPendingChanges) return 'Syncing changes with teammates';
    return 'Connected - changes sync in real-time';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2">
            <Badge variant={getStatusColor()} className="flex items-center space-x-1">
              {getStatusIcon()}
              <span className="text-xs">{getStatusText()}</span>
            </Badge>
            {isConnected && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Users className="h-3 w-3" />
                <span>Team</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default RealtimeStatus;
