import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  Router, 
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useEnhancedNetworkStatus } from '@/hooks/useEnhancedNetworkStatus';

interface NetworkStatusBarProps {
  rundownId: string | null;
  className?: string;
  showDetails?: boolean;
}

const NetworkStatusBar = ({ rundownId, className, showDetails = false }: NetworkStatusBarProps) => {
  const networkStatus = useEnhancedNetworkStatus(rundownId);
  const connectionStatus = networkStatus.getConnectionStatus();

  if (!rundownId && !showDetails) {
    return null;
  }

  const getIcon = () => {
    switch (networkStatus.transportMode) {
      case 'cloud':
        return <Cloud className="h-3 w-3" />;
      case 'local':
        return <Router className="h-3 w-3" />;
      case 'offline':
        return <WifiOff className="h-3 w-3" />;
      default:
        return <Wifi className="h-3 w-3" />;
    }
  };

  const getStatusIcon = () => {
    if (!networkStatus.isConnected && networkStatus.transportMode !== 'offline') {
      return <AlertTriangle className="h-3 w-3 text-red-500" />;
    }
    if (networkStatus.isStable) {
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    }
    return <Activity className="h-3 w-3 text-yellow-500 animate-pulse" />;
  };

  const getQualityColor = () => {
    const score = connectionStatus.score;
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatLatency = (latency: number) => {
    if (latency === 0) return 'N/A';
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 px-2 py-1 ${className || ''}`}>
            {/* Transport Mode Icon */}
            <div className="flex items-center gap-1">
              {getIcon()}
              <span className="text-xs font-medium capitalize">
                {networkStatus.transportMode}
              </span>
            </div>

            {/* Connection Quality Bar */}
            {showDetails && (
              <div className="flex items-center gap-1 min-w-[60px]">
                <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${getQualityColor()}`}
                    style={{ width: `${Math.max(connectionStatus.score, 5)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {connectionStatus.score}%
                </span>
              </div>
            )}

            {/* Status Indicator */}
            {getStatusIcon()}

            {/* Failover Count (if any) */}
            {networkStatus.failoverCount > 0 && showDetails && (
              <Badge variant="outline" className="text-xs h-4 px-1">
                {networkStatus.failoverCount}x
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">
              {connectionStatus.description}
            </div>
            
            <div className="text-xs space-y-1">
              <div>Mode: {networkStatus.transportMode}</div>
              <div>Status: {connectionStatus.text}</div>
              <div>Latency: {formatLatency(connectionStatus.latency)}</div>
              <div>Quality: {connectionStatus.score}%</div>
              {networkStatus.failoverCount > 0 && (
                <div>Failovers: {networkStatus.failoverCount}</div>
              )}
            </div>
            
            {!networkStatus.isStable && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                Connection stabilizing...
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default NetworkStatusBar;