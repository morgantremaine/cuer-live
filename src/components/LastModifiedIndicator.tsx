
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LastModifiedIndicatorProps {
  lastModifiedBy?: string;
  lastModifiedAt?: number;
  changes?: Array<{
    field: string;
    timestamp: number;
  }>;
  compact?: boolean;
}

const LastModifiedIndicator = ({ 
  lastModifiedBy, 
  lastModifiedAt, 
  changes = [],
  compact = false 
}: LastModifiedIndicatorProps) => {
  if (!lastModifiedBy || !lastModifiedAt) {
    return null;
  }

  const timeAgo = formatDistanceToNow(new Date(lastModifiedAt), { addSuffix: true });
  const modifiedFields = changes.map(c => c.field).join(', ');

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs flex items-center space-x-1">
              <User className="h-2 w-2" />
              <span className="truncate max-w-16">{lastModifiedBy}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm space-y-1">
              <div className="font-medium">Last modified by {lastModifiedBy}</div>
              <div className="text-gray-500">{timeAgo}</div>
              {modifiedFields && (
                <div className="text-gray-500">Fields: {modifiedFields}</div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-xs text-gray-500">
      <div className="flex items-center space-x-1">
        <User className="h-3 w-3" />
        <span>{lastModifiedBy}</span>
      </div>
      <div className="flex items-center space-x-1">
        <Clock className="h-3 w-3" />
        <span>{timeAgo}</span>
      </div>
      {modifiedFields && (
        <Badge variant="secondary" className="text-xs">
          {modifiedFields}
        </Badge>
      )}
    </div>
  );
};

export default LastModifiedIndicator;
