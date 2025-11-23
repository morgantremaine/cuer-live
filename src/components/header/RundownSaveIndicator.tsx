import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, AlertCircle, Loader2, Users } from 'lucide-react';
import { debugLogger } from '@/utils/debugLogger';

interface SaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveError: string | null;
  hasContentChanges?: boolean; // Additional flag to distinguish content vs column changes
  saveCompletionCount?: number; // Counter incremented on each save completion
  failedSavesCount?: number; // Number of failed saves pending retry
}

interface RundownSaveIndicatorProps {
  saveState: SaveState;
  shouldShowSavedFlash?: boolean;
  isTeammateEditing?: boolean;
  activeTeammateNames?: string[];
  isMobile?: boolean; // Add mobile prop to suppress teammate editing
  onRetry?: () => void; // Callback to trigger manual retry
  onScrollToTeammate?: () => void; // Callback to scroll to active teammate's cell
}

const RundownSaveIndicator = ({ saveState, shouldShowSavedFlash, isTeammateEditing = false, activeTeammateNames = [], isMobile = false, onRetry, onScrollToTeammate }: RundownSaveIndicatorProps) => {
  const { isSaving, lastSaved, hasUnsavedChanges, saveError, hasContentChanges = true, saveCompletionCount, failedSavesCount = 0 } = saveState;
  const [showSaved, setShowSaved] = useState(false);
  const [showTemporarySaved, setShowTemporarySaved] = useState(false);
  const [lastCompletionCount, setLastCompletionCount] = useState(0);
  const [isLongSave, setIsLongSave] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  debugLogger.autosave('RundownSaveIndicator render:', {
    isTeammateEditing,
    isSaving,
    hasUnsavedChanges,
    hasContentChanges,
    showSaved,
    showTemporarySaved,
    saveCompletionCount,
    lastCompletionCount,
    shouldShow: !(!hasContentChanges && !shouldShowSavedFlash && !showSaved && !isTeammateEditing)
  });

  // Show saved indicator for 3 seconds after save (when lastSaved is available)
  useEffect(() => {
    if (lastSaved && !hasUnsavedChanges && !isSaving) {
      setShowSaved(true);
      const timer = setTimeout(() => {
        setShowSaved(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setShowSaved(false);
    }
  }, [lastSaved, hasUnsavedChanges, isSaving]);

  // Track save completion count to show temporary "Saved" message
  // This approach works even for super-fast saves that don't trigger isSaving UI state
  useEffect(() => {
    if (saveCompletionCount && saveCompletionCount !== lastCompletionCount) {
      console.log(`💾 SAVE COMPLETED: Count ${lastCompletionCount} → ${saveCompletionCount}`);
      setLastCompletionCount(saveCompletionCount);
      
      // Show "Saved" whenever a save completes, even if user already started typing again
      // Don't check hasUnsavedChanges here - that creates a race condition
      if (!saveError && hasContentChanges) {
        console.log('✅ Showing "Saved" message after completion');
        setShowTemporarySaved(true);
      }
    }
  }, [saveCompletionCount, lastCompletionCount, saveError, hasContentChanges]);

  // External trigger to flash "Saved" (e.g., from parent after content save completes)
  useEffect(() => {
    if (shouldShowSavedFlash && !timerRef.current) {
      setShowTemporarySaved(true);
    }
  }, [shouldShowSavedFlash]);

  // Centralized timer to hide the temporary saved message after 2 seconds
  useEffect(() => {
    if (showTemporarySaved && !timerRef.current) {
      // Only start a new timer if one isn't already running
      timerRef.current = setTimeout(() => {
        setShowTemporarySaved(false);
        timerRef.current = null;
      }, 2000);
      
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [showTemporarySaved]);

  // Show "Still saving..." after 3 seconds for user confidence
  useEffect(() => {
    if (isSaving) {
      const timer = setTimeout(() => {
        setIsLongSave(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setIsLongSave(false);
    }
  }, [isSaving]);

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Determine what save status to show
  let saveStatusElement = null;

  if (isSaving) {
    saveStatusElement = (
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{isLongSave ? 'Still saving...' : 'Saving...'}</span>
      </div>
    );
  } else if (saveError || failedSavesCount > 0) {
    const errorMessage = failedSavesCount > 0 
      ? `${failedSavesCount} update${failedSavesCount === 1 ? '' : 's'} failed`
      : 'Save failed';
      
    saveStatusElement = (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
        <AlertCircle className="h-4 w-4" />
        <span>{errorMessage}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="underline hover:no-underline font-medium"
          >
            Retry
          </button>
        )}
      </div>
    );
  } else if (hasUnsavedChanges) {
    saveStatusElement = (
      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs">
        <AlertCircle className="h-4 w-4" />
        <span>Unsaved changes</span>
      </div>
    );
  } else if (showSaved && lastSaved) {
    saveStatusElement = (
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs">
        <CheckCircle className="h-4 w-4" />
        <span>Saved {formatLastSaved(lastSaved)}</span>
      </div>
    );
  } else if (showTemporarySaved) {
    saveStatusElement = (
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs">
        <CheckCircle className="h-4 w-4" />
        <span>Saved</span>
      </div>
    );
  }

  // Only show save status if we have content changes
  if (saveStatusElement && !hasContentChanges && !showTemporarySaved && !showSaved) {
    saveStatusElement = null;
  }

  // Determine if we should show teammate editing indicator
  let teammateElement = null;
  if (isTeammateEditing && !isMobile) {
    const displayText = activeTeammateNames.length > 0 
      ? `${activeTeammateNames.join(', ')} ${activeTeammateNames.length === 1 ? 'is' : 'are'} editing...`
      : 'Teammate editing...';
      
    teammateElement = (
      <div 
        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs cursor-pointer hover:text-blue-700 dark:hover:text-blue-300"
        onClick={onScrollToTeammate}
        title="Click to scroll to where they're editing"
      >
        <Users className="h-4 w-4" />
        <span>{displayText}</span>
      </div>
    );
  }

  // Show both if both exist, or just one, or null if neither
  if (!saveStatusElement && !teammateElement) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 ml-2">
      {saveStatusElement}
      {teammateElement}
    </div>
  );
};

export default RundownSaveIndicator;