import React from 'react';
import { User, Lock } from 'lucide-react';

interface CellLockIndicatorProps {
  userName: string;
  isMyLock?: boolean;
  className?: string;
}

const CellLockIndicator = ({ userName, isMyLock = false, className = '' }: CellLockIndicatorProps) => {
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
      isMyLock 
        ? 'bg-primary/10 text-primary border border-primary/20' 
        : 'bg-destructive/10 text-destructive border border-destructive/20'
    } ${className}`}>
      {isMyLock ? (
        <User className="h-3 w-3" />
      ) : (
        <Lock className="h-3 w-3" />
      )}
      <span className="truncate max-w-[100px]">
        {isMyLock ? 'Editing' : `${userName} editing`}
      </span>
    </div>
  );
};

export default CellLockIndicator;