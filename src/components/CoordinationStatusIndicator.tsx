import React from 'react';
import { useCellUpdateCoordination } from '@/hooks/useCellUpdateCoordination';
import { Loader2, Clock, AlertCircle } from 'lucide-react';

interface CoordinationStatusIndicatorProps {
  className?: string;
}

export const CoordinationStatusIndicator: React.FC<CoordinationStatusIndicatorProps> = ({ 
  className = '' 
}) => {
  const coordination = useCellUpdateCoordination();

  // Check what operations are currently active
  const isCellUpdateActive = coordination.cellUpdateInProgressRef.current;
  const isStructuralActive = coordination.structuralOperationRef.current;
  const isShowcallerActive = coordination.showcallerOperationRef.current;
  const isAnyActive = coordination.isAnyOperationInProgress();

  // Don't show indicator if nothing is happening
  if (!isAnyActive) {
    return null;
  }

  const getStatusInfo = () => {
    if (isStructuralActive) {
      return {
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        text: 'Moving rows...',
        bgColor: 'bg-primary/10',
        textColor: 'text-primary',
        borderColor: 'border-primary/20'
      };
    }
    
    if (isCellUpdateActive) {
      return {
        icon: <Clock className="h-3 w-3" />,
        text: 'Saving changes...',
        bgColor: 'bg-secondary/10',
        textColor: 'text-secondary-foreground',
        borderColor: 'border-secondary/20'
      };
    }
    
    if (isShowcallerActive) {
      return {
        icon: <AlertCircle className="h-3 w-3" />,
        text: 'Updating showcaller...',
        bgColor: 'bg-accent/10',
        textColor: 'text-accent-foreground',
        borderColor: 'border-accent/20'
      };
    }

    return {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: 'Processing...',
      bgColor: 'bg-muted/50',
      textColor: 'text-muted-foreground',
      borderColor: 'border-muted'
    };
  };

  const status = getStatusInfo();

  return (
    <div 
      className={`
        inline-flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium
        ${status.bgColor} ${status.textColor} ${status.borderColor}
        transition-all duration-200 ease-in-out
        ${className}
      `}
    >
      {status.icon}
      <span>{status.text}</span>
    </div>
  );
};