import React from 'react';
import { AlertCircle, Lock, Loader2 } from 'lucide-react';
import { useCellUpdateContext } from '@/contexts/CellUpdateContext';

interface OperationCoordinationIndicatorProps {
  className?: string;
}

/**
 * Subtle UI indicator for operation coordination
 * Shows when operations are being coordinated to prevent conflicts
 */
export const OperationCoordinationIndicator = ({ className = '' }: OperationCoordinationIndicatorProps) => {
  const { 
    cellUpdateInProgressRef, 
    structuralOperationRef, 
    showcallerOperationRef,
    operationQueueRef
  } = useCellUpdateContext();

  const isCellUpdateActive = cellUpdateInProgressRef.current;
  const isStructuralActive = structuralOperationRef.current;
  const isShowcallerActive = showcallerOperationRef.current;
  const queuedCount = operationQueueRef.current.length;

  // Don't show if nothing is happening
  if (!isCellUpdateActive && !isStructuralActive && !isShowcallerActive && queuedCount === 0) {
    return null;
  }

  const getStatusInfo = () => {
    if (isStructuralActive) {
      return {
        icon: Lock,
        text: 'Coordinating changes',
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20'
      };
    }

    if (queuedCount > 0) {
      return {
        icon: AlertCircle,
        text: `${queuedCount} operation${queuedCount > 1 ? 's' : ''} queued`,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20'
      };
    }

    if (isCellUpdateActive) {
      return {
        icon: Loader2,
        text: 'Syncing changes',
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary/20'
      };
    }

    if (isShowcallerActive) {
      return {
        icon: Loader2,
        text: 'Showcaller active',
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20'
      };
    }

    return null;
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  const Icon = statusInfo.icon;

  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-md border
        ${statusInfo.bgColor} ${statusInfo.borderColor}
        transition-all duration-200 animate-in fade-in slide-in-from-top-2
        ${className}
      `}
    >
      <Icon className={`w-3.5 h-3.5 ${statusInfo.color} ${Icon === Loader2 ? 'animate-spin' : ''}`} />
      <span className={`text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    </div>
  );
};
