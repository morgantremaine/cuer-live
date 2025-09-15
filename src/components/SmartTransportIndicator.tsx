import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Cloud, 
  Router, 
  WifiOff, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Zap,
  Settings
} from 'lucide-react';
import { useSmartTransportSwitching } from '@/hooks/useSmartTransportSwitching';

interface SmartTransportIndicatorProps {
  rundownId: string | null;
  className?: string;
  showDetails?: boolean;
}

const SmartTransportIndicator = ({ 
  rundownId, 
  className,
  showDetails = false 
}: SmartTransportIndicatorProps) => {
  const { transportState, transportHealth, getTransportStatus, forceTransportMode, performHealthCheck } = useSmartTransportSwitching(rundownId);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isHealthChecking, setIsHealthChecking] = useState(false);

  const status = getTransportStatus();

  const handleForceMode = async (mode: 'cloud' | 'local' | 'offline') => {
    await forceTransportMode(mode, 'User manual selection');
    setIsDetailsOpen(false);
  };

  const handleHealthCheck = async () => {
    setIsHealthChecking(true);
    await performHealthCheck();
    setIsHealthChecking(false);
  };

  const formatLatency = (latency: number) => {
    if (latency === 0) return 'N/A';
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) return `${minutes}m ${seconds}s ago`;
    return `${seconds}s ago`;
  };

  const getStatusBadgeProps = () => {
    const baseProps = {
      className: `flex items-center gap-1.5 px-2 py-1 ${className || ''}`
    };

    switch (status.status) {
      case 'connected':
        return {
          ...baseProps,
          className: `${baseProps.className} bg-green-500 text-white hover:bg-green-600`,
          variant: 'default' as const
        };
      case 'connecting':
        return {
          ...baseProps,
          className: `${baseProps.className} bg-yellow-500 text-white hover:bg-yellow-600`,
          variant: 'secondary' as const
        };
      case 'failed':
        return {
          ...baseProps,
          className: `${baseProps.className} bg-red-500 text-white hover:bg-red-600`,
          variant: 'destructive' as const
        };
      default:
        return {
          ...baseProps,
          className: `${baseProps.className} bg-gray-500 text-white hover:bg-gray-600`,
          variant: 'outline' as const
        };
    }
  };

  const badgeProps = getStatusBadgeProps();

  if (!rundownId && !showDetails) {
    return null;
  }

  return (
    <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
      <DialogTrigger asChild>
        <Badge {...badgeProps} className="cursor-pointer">
          <span className="text-lg">{status.icon}</span>
          <span className="text-xs font-medium capitalize">
            {status.mode}
            {status.status === 'connecting' && '...'}
          </span>
          {!status.isStable && status.status === 'connected' && (
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          )}
        </Badge>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Transport Status & Health
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{status.icon}</span>
                  <div>
                    <div className="font-semibold capitalize">{status.mode} Mode</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {status.status}
                      {status.reconnectAttempts > 0 && ` (${status.reconnectAttempts} attempts)`}
                    </div>
                  </div>
                </div>
                {status.reason && (
                  <div className="text-xs text-muted-foreground max-w-md">
                    {status.reason}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHealthCheck}
                  disabled={isHealthChecking}
                >
                  {isHealthChecking ? (
                    <Activity className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {isHealthChecking ? 'Checking...' : 'Health Check'}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Transport Health Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Transport Health</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cloud Health */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Cloud
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    {transportHealth.cloud.available ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {transportHealth.cloud.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Latency: {formatLatency(transportHealth.cloud.latency)}</div>
                    <div>Last check: {formatTimestamp(transportHealth.cloud.lastCheck)}</div>
                    {transportHealth.cloud.error && (
                      <div className="text-red-600 dark:text-red-400">
                        {transportHealth.cloud.error}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleForceMode('cloud')}
                    disabled={status.mode === 'cloud'}
                  >
                    Use Cloud
                  </Button>
                </CardContent>
              </Card>

              {/* Local Health */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Router className="h-4 w-4" />
                    Local Network
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    {transportHealth.local.available ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {transportHealth.local.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Hosts: {transportHealth.local.hosts}</div>
                    <div>Latency: {formatLatency(transportHealth.local.latency)}</div>
                    <div>Last check: {formatTimestamp(transportHealth.local.lastCheck)}</div>
                    {transportHealth.local.error && (
                      <div className="text-red-600 dark:text-red-400">
                        {transportHealth.local.error}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleForceMode('local')}
                    disabled={status.mode === 'local'}
                  >
                    Use Local
                  </Button>
                </CardContent>
              </Card>

              {/* Offline Health */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <WifiOff className="h-4 w-4" />
                    Offline Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Always Available</span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Queued: {transportHealth.offline.queueSize} changes</div>
                    <div>Last sync: {formatTimestamp(transportHealth.offline.lastSync)}</div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleForceMode('offline')}
                    disabled={status.mode === 'offline'}
                  >
                    Force Offline
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Connection Timeline */}
          {status.lastConnection > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Connection History
                </h3>
                <div className="text-sm text-muted-foreground">
                  Last successful connection: {formatTimestamp(status.lastConnection)}
                </div>
                {transportState.isStable ? (
                  <div className="text-sm text-green-600 dark:text-green-400">
                    Connection is stable
                  </div>
                ) : (
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">
                    Connection stabilizing...
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartTransportIndicator;