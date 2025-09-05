import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRealtimeConnection } from '@/components/RealtimeConnectionProvider';

interface RealtimeDebugOverlayProps {
  rundownId?: string;
  lastSeenDocVersion?: number;
  currentDocVersion?: number;
  connectionStatus?: boolean;
  className?: string;
}

const RealtimeDebugOverlay = ({ 
  rundownId, 
  lastSeenDocVersion, 
  currentDocVersion,
  connectionStatus,
  className 
}: RealtimeDebugOverlayProps) => {
  const [isMinimized, setIsMinimized] = useState(true);
  const { isConnected, isProcessingUpdate } = useRealtimeConnection();

  // Only show in development or when explicitly enabled
  const shouldShow = process.env.NODE_ENV === 'development' || 
    localStorage.getItem('realtime-debug-enabled') === 'true';

  if (!shouldShow) return null;

  const getStatusColor = (connected: boolean) => {
    return connected ? 'bg-green-500' : 'bg-red-500';
  };

  const getVersionStatus = () => {
    if (!lastSeenDocVersion || !currentDocVersion) return 'unknown';
    if (lastSeenDocVersion === currentDocVersion) return 'synced';
    if (lastSeenDocVersion < currentDocVersion) return 'behind';
    return 'ahead'; // shouldn't happen normally
  };

  const versionStatus = getVersionStatus();
  const versionColor = versionStatus === 'synced' ? 'bg-green-100 text-green-800' : 
                     versionStatus === 'behind' ? 'bg-yellow-100 text-yellow-800' : 
                     'bg-red-100 text-red-800';

  return (
    <Card className={`fixed bottom-4 right-4 z-50 w-80 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Realtime Debug</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0"
          >
            {isMinimized ? '↑' : '↓'}
          </Button>
        </div>
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Connection</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(isConnected || connectionStatus || false)}`} />
              <Badge variant={isConnected || connectionStatus ? 'default' : 'destructive'}>
                {isConnected || connectionStatus ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </div>

          {isProcessingUpdate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Processing</span>
              <Badge variant="secondary" className="animate-pulse">
                Updating...
              </Badge>
            </div>
          )}

          {rundownId && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Rundown ID</span>
              <div className="text-xs font-mono bg-muted p-1 rounded truncate">
                {rundownId.split('-')[0]}...
              </div>
            </div>
          )}

          {(lastSeenDocVersion !== undefined || currentDocVersion !== undefined) && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Document Versions</span>
              <div className="flex items-center justify-between text-xs">
                <span>Last Seen:</span>
                <Badge variant="outline">{lastSeenDocVersion || 0}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Current:</span>
                <Badge variant="outline">{currentDocVersion || 0}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Status:</span>
                <Badge className={versionColor}>
                  {versionStatus}
                </Badge>
              </div>
            </div>
          )}

          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => localStorage.removeItem('realtime-debug-enabled')}
              className="w-full text-xs"
            >
              Hide Debug Overlay
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default RealtimeDebugOverlay;