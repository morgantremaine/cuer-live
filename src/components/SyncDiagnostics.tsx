import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Wifi, WifiOff, Zap, Settings } from 'lucide-react';
import { FEATURE_FLAGS, enableFeature, disableFeature } from '@/utils/featureFlags';
import SimplifiedSyncIndicator from './SimplifiedSyncIndicator';

interface SyncDiagnosticsProps {
  isConnected?: boolean;
  isProcessing?: boolean;
  lastSyncTime?: string | null;
  className?: string;
}

const SyncDiagnostics = ({ 
  isConnected = false, 
  isProcessing = false, 
  lastSyncTime = null,
  className 
}: SyncDiagnosticsProps) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const toggleSimplifiedSync = () => {
    if (FEATURE_FLAGS.SIMPLIFIED_SYNC) {
      disableFeature('SIMPLIFIED_SYNC');
    } else {
      enableFeature('SIMPLIFIED_SYNC');
    }
    // Force reload to apply changes
    window.location.reload();
  };

  if (!FEATURE_FLAGS.SYNC_DIAGNOSTICS) {
    return null;
  }

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDiagnostics(!showDiagnostics)}
        className="h-8 px-2"
      >
        <Activity className="h-4 w-4" />
      </Button>

      {showDiagnostics && (
        <Card className="absolute top-10 right-0 w-80 z-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Sync Diagnostics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Connection Status</h4>
              <SimplifiedSyncIndicator
                isConnected={isConnected}
                isProcessing={isProcessing}
                lastSyncTime={lastSyncTime}
              />
            </div>

            {/* Feature Flags */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Feature Flags</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Simplified Sync</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant={FEATURE_FLAGS.SIMPLIFIED_SYNC ? 'default' : 'secondary'}>
                      {FEATURE_FLAGS.SIMPLIFIED_SYNC ? 'ON' : 'OFF'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={toggleSimplifiedSync}
                    >
                      <Zap className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Diagnostics</span>
                  <Badge variant={FEATURE_FLAGS.SYNC_DIAGNOSTICS ? 'default' : 'secondary'}>
                    {FEATURE_FLAGS.SYNC_DIAGNOSTICS ? 'ON' : 'OFF'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Sync Health */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Sync Health</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center space-x-1">
                  {isConnected ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                  <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                  }`} />
                  <span>{isProcessing ? 'Syncing' : 'Idle'}</span>
                </div>
              </div>
              
              {lastSyncTime && (
                <div className="text-xs text-muted-foreground mt-2">
                  Last sync: {new Date(lastSyncTime).toLocaleString()}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Quick Actions</h4>
              <div className="space-y-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                  onClick={() => window.location.reload()}
                >
                  Force Reload
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start text-xs"
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                >
                  Clear Cache & Reload
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SyncDiagnostics;