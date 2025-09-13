import React from 'react';
import { useUnifiedAutoSave } from './UnifiedAutoSaveProvider';
import { CheckCircle, Circle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaveStatusIndicatorProps {
  className?: string;
  showText?: boolean;
  showConflicts?: boolean;
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  className,
  showText = true,
  showConflicts = true
}) => {
  const { 
    isSaving, 
    hasPendingChanges, 
    lastSaveTime, 
    hasConflicts, 
    conflictCount 
  } = useUnifiedAutoSave();

  const getStatus = () => {
    if (hasConflicts && showConflicts) {
      return {
        icon: AlertTriangle,
        text: `${conflictCount} conflict${conflictCount !== 1 ? 's' : ''}`,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10'
      };
    }
    
    if (isSaving) {
      return {
        icon: Circle,
        text: 'Saving...',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        animate: 'animate-pulse'
      };
    }
    
    if (hasPendingChanges) {
      return {
        icon: Clock,
        text: 'Changes pending',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10'
      };
    }
    
    if (lastSaveTime) {
      const timeAgo = Math.round((Date.now() - lastSaveTime.getTime()) / 1000);
      return {
        icon: CheckCircle,
        text: timeAgo < 60 ? 'Saved' : `Saved ${Math.round(timeAgo / 60)}m ago`,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10'
      };
    }
    
    return {
      icon: Circle,
      text: 'Ready',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted'
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <div className={cn(
      'flex items-center gap-2 px-2 py-1 rounded-md text-sm',
      status.bgColor,
      className
    )}>
      <Icon 
        className={cn(
          'w-4 h-4',
          status.color,
          status.animate
        )} 
      />
      {showText && (
        <span className={cn('text-xs font-medium', status.color)}>
          {status.text}
        </span>
      )}
    </div>
  );
};