/**
 * OT Status Bar
 * 
 * Shows real-time collaboration status and active users
 */

import React from 'react';
import { Users, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface OTStatusBarProps {
  isConnected: boolean;
  isOTActive: boolean;
  activeSessions: Array<{
    userId: string;
    userName: string;
    activeCell?: string;
  }>;
  conflictCount: number;
  className?: string;
}

export const OTStatusBar: React.FC<OTStatusBarProps> = ({
  isConnected,
  isOTActive,
  activeSessions,
  conflictCount,
  className = ''
}) => {
  const otherUsers = activeSessions.filter(session => session.userId !== 'current');
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1 text-xs bg-background border rounded-lg ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi className="w-3 h-3 text-green-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-red-500" />
        )}
        <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Activity Indicator */}
      {isOTActive && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-blue-600">Syncing</span>
        </div>
      )}

      {/* Active Users */}
      {otherUsers.length > 0 && (
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-blue-500" />
          <span className="text-blue-600">
            {otherUsers.length} editing
          </span>
          {otherUsers.length <= 3 && (
            <div className="flex gap-1 ml-1">
              {otherUsers.map((user, index) => (
                <div
                  key={user.userId}
                  className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium"
                  title={user.userName}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conflict Count */}
      {conflictCount > 0 && (
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-orange-500" />
          <span className="text-orange-600">
            {conflictCount} resolved
          </span>
        </div>
      )}

      {/* OT Label */}
      <div className="ml-auto">
        <span className="text-muted-foreground">
          Collaborative Mode
        </span>
      </div>
    </div>
  );
};