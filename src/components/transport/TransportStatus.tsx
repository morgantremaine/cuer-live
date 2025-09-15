import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Router, Cloud, AlertCircle } from 'lucide-react';
import { TransportConfig } from '@/hooks/useTransportManager';

interface TransportStatusProps {
  transport: TransportConfig;
  className?: string;
}

const TransportStatus = ({ transport, className }: TransportStatusProps) => {
  const getStatusInfo = () => {
    switch (transport.mode) {
      case 'cloud':
        return {
          icon: Cloud,
          label: 'Cloud',
          color: transport.isConnected ? 'bg-green-500' : 'bg-yellow-500',
          textColor: 'text-white'
        };
      case 'local':
        return {
          icon: Router,
          label: 'LAN',
          color: transport.isConnected ? 'bg-blue-500' : 'bg-orange-500',
          textColor: 'text-white'
        };
      case 'offline':
        return {
          icon: WifiOff,
          label: 'Offline',
          color: 'bg-gray-500',
          textColor: 'text-white'
        };
      default:
        return {
          icon: AlertCircle,
          label: 'Unknown',
          color: 'bg-red-500',
          textColor: 'text-white'
        };
    }
  };

  const { icon: Icon, label, color, textColor } = getStatusInfo();

  const getTooltipText = () => {
    if (transport.mode === 'cloud') {
      return transport.isConnected 
        ? 'Connected to cloud - real-time sync active'
        : 'Connecting to cloud...';
    }
    
    if (transport.mode === 'local') {
      return transport.isConnected
        ? `Connected to local host - ${transport.localHostUrl}`
        : 'Connecting to local host...';
    }
    
    return 'Offline mode - changes saved locally';
  };

  return (
    <div className={className} title={getTooltipText()}>
      <Badge 
        variant="secondary" 
        className={`${color} ${textColor} flex items-center gap-1.5 px-2 py-1`}
      >
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium">{label}</span>
        {!transport.isConnected && transport.mode !== 'offline' && (
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        )}
      </Badge>
      
      {transport.reconnectAttempts > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          Retry {transport.reconnectAttempts}
        </div>
      )}
    </div>
  );
};

export default TransportStatus;