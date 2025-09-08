import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveError: string | null;
  hasContentChanges?: boolean; // Additional flag to distinguish content vs column changes
}

interface RundownSaveIndicatorProps {
  saveState: SaveState;
}

const RundownSaveIndicator = ({ saveState }: RundownSaveIndicatorProps) => {
  const { isSaving, lastSaved, hasUnsavedChanges, saveError, hasContentChanges = true } = saveState;
  const [showSaved, setShowSaved] = useState(false);
  const [showTemporarySaved, setShowTemporarySaved] = useState(false);
  const [previouslySaving, setPreviouslySaving] = useState(false);

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

  // Track when saving transitions from true to false to show temporary "Saved" message
  // Only show for content changes, not column-only changes
  useEffect(() => {
    if (previouslySaving && !isSaving && !hasUnsavedChanges && !saveError && !lastSaved && hasContentChanges) {
      setShowTemporarySaved(true);
      const timer = setTimeout(() => {
        setShowTemporarySaved(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    
    setPreviouslySaving(isSaving);
  }, [isSaving, hasUnsavedChanges, saveError, lastSaved, previouslySaving, hasContentChanges]);

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Don't show any indicators if changes are only column-related
  if (!hasContentChanges) {
    return null;
  }

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs ml-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (saveError) {
    return (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs ml-2">
        <AlertCircle className="h-4 w-4" />
        <span>Save failed</span>
      </div>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs ml-2">
        <AlertCircle className="h-4 w-4" />
        <span>Unsaved changes</span>
      </div>
    );
  }

  if (showSaved && lastSaved) {
    return (
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs ml-2">
        <CheckCircle className="h-4 w-4" />
        <span>Saved {formatLastSaved(lastSaved)}</span>
      </div>
    );
  }

  // Show temporary "Saved" state for auto-save systems without lastSaved tracking
  if (showTemporarySaved) {
    return (
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs ml-2">
        <CheckCircle className="h-4 w-4" />
        <span>Saved</span>
      </div>
    );
  }

  return null;
};

export default RundownSaveIndicator;