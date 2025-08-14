import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Edit3, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditingIndicatorProps {
  isBeingEdited: boolean;
  editingUserEmail?: string;
  hasConflict?: boolean;
  className?: string;
}

export const EditingIndicator: React.FC<EditingIndicatorProps> = ({
  isBeingEdited,
  editingUserEmail,
  hasConflict,
  className
}) => {
  if (!isBeingEdited && !hasConflict) return null;

  const getDisplayName = (email: string) => {
    return email.split('@')[0];
  };

  return (
    <div className={cn("absolute top-1 right-1 z-50", className)}>
      {hasConflict ? (
        <Badge variant="destructive" className="text-xs px-1 py-0 h-5">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Conflict
        </Badge>
      ) : isBeingEdited && editingUserEmail ? (
        <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
          <Edit3 className="h-3 w-3 mr-1" />
          {getDisplayName(editingUserEmail)}
        </Badge>
      ) : null}
    </div>
  );
};