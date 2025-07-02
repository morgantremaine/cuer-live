
import React, { useState } from 'react';
import { Clock, Save, Loader2, CheckCircle, AlertCircle, Wifi, WifiOff, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TimezoneSelector from './TimezoneSelector';
import { formatTime } from '@/utils/timeUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface RundownHeaderProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  title: string;
  onTitleChange: (title: string) => void;
  rundownStartTime: string;
  onRundownStartTimeChange: (startTime: string) => void;
  items?: any[];
  visibleColumns?: any[];
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  isConnected?: boolean;
  isProcessingRealtimeUpdate?: boolean;
  isPlaying?: boolean;
  currentSegmentId?: string | null;
  timeRemaining?: number;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
}

const RundownHeader = ({
  currentTime,
  timezone,
  onTimezoneChange,
  totalRuntime,
  hasUnsavedChanges,
  isSaving,
  title,
  onTitleChange,
  rundownStartTime,
  onRundownStartTimeChange,
  items = [],
  visibleColumns = [],
  onUndo,
  canUndo,
  lastAction,
  isConnected = true,
  isProcessingRealtimeUpdate = false,
  isPlaying = false,
  currentSegmentId,
  timeRemaining = 0,
  autoScrollEnabled = false,
  onToggleAutoScroll
}: RundownHeaderProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const isMobile = useIsMobile();

  const handleTitleSave = () => {
    onTitleChange(titleValue);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTitleValue(title);
      setIsEditingTitle(false);
    }
  };

  const getSaveStatus = () => {
    if (isSaving) {
      return (
        <div className="flex items-center gap-2 text-green-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      );
    }
    
    if (hasUnsavedChanges) {
      return (
        <div className="flex items-center gap-2 text-yellow-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Unsaved changes</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-green-500">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">Saved</span>
      </div>
    );
  };

  const getConnectionStatus = () => {
    if (isProcessingRealtimeUpdate) {
      return (
        <div className="flex items-center gap-2 text-blue-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Syncing...</span>
        </div>
      );
    }
    
    if (!isConnected) {
      return (
        <div className="flex items-center gap-2 text-red-500">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm">Offline</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-green-500">
        <Wifi className="h-4 w-4" />
        <span className="text-sm">Connected</span>
      </div>
    );
  };

  return (
    <div className="bg-background border-b border-border px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left section - Title and save status */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isEditingTitle ? (
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="text-lg font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                autoFocus
              />
            ) : (
              <h1 
                className="text-lg font-semibold cursor-pointer hover:text-muted-foreground transition-colors truncate"
                onClick={() => setIsEditingTitle(true)}
              >
                {title}
              </h1>
            )}
          </div>
          
          {!isMobile && (
            <div className="flex items-center gap-4">
              {getSaveStatus()}
              {getConnectionStatus()}
            </div>
          )}
        </div>

        {/* Right section - Time and controls */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Undo button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className={cn(
                    "flex items-center gap-2",
                    canUndo ? "text-blue-600 hover:text-blue-700" : "text-muted-foreground"
                  )}
                >
                  <RotateCcw className="h-4 w-4" />
                  {!isMobile && <span>Undo</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {canUndo ? `Undo: ${lastAction}` : 'Nothing to undo'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Auto-scroll toggle */}
          {onToggleAutoScroll && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={autoScrollEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={onToggleAutoScroll}
                    className="flex items-center gap-2"
                  >
                    {isPlaying ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {!isMobile && <span>Auto-scroll</span>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {autoScrollEnabled ? 'Disable auto-scroll' : 'Enable auto-scroll'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Start time */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Start:</span>
            <Input
              type="time"
              value={rundownStartTime}
              onChange={(e) => onRundownStartTimeChange(e.target.value)}
              className="w-24 h-8 text-sm"
              step="1"
            />
          </div>

          {/* Current time */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono">
              {formatTime(currentTime)}
            </span>
          </div>

          {/* Timezone selector */}
          <TimezoneSelector
            value={timezone}
            onChange={onTimezoneChange}
          />

          {/* Total runtime */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total:</span>
            <Badge variant="outline" className="font-mono">
              {totalRuntime}
            </Badge>
          </div>
        </div>
      </div>

      {/* Mobile status indicators */}
      {isMobile && (
        <div className="flex items-center justify-between gap-4 mt-2 pt-2 border-t border-border">
          {getSaveStatus()}
          {getConnectionStatus()}
        </div>
      )}
    </div>
  );
};

export default RundownHeader;
