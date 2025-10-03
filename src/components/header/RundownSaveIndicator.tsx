import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, AlertCircle, Loader2, Users } from 'lucide-react';
import { debugLogger } from '@/utils/debugLogger';

interface SaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveError: string | null;
  hasContentChanges?: boolean; // Additional flag to distinguish content vs column changes
}

interface RundownSaveIndicatorProps {
  saveState: SaveState;
  shouldShowSavedFlash?: boolean;
  isTeammateEditing?: boolean;
  activeTeammateNames?: string[];
  isMobile?: boolean; // Add mobile prop to suppress teammate editing
}

const RundownSaveIndicator = ({ saveState, shouldShowSavedFlash, isTeammateEditing = false, activeTeammateNames = [], isMobile = false }: RundownSaveIndicatorProps) => {
  const { isSaving, lastSaved, hasUnsavedChanges, saveError, hasContentChanges = true } = saveState;
  const [showSaved, setShowSaved] = useState(false);
  const [showTemporarySaved, setShowTemporarySaved] = useState(false);
  const [previouslySaving, setPreviouslySaving] = useState(false);
  const [isLongSave, setIsLongSave] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  debugLogger.autosave('RundownSaveIndicator render:', {
    isTeammateEditing,
    isSaving,
    hasUnsavedChanges,
    hasContentChanges,
    showSaved,
    showTemporarySaved,
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

  // Track when saving transitions from true to false to show temporary "Saved" message
  // Only show for content changes, not column-only changes
  useEffect(() => {
    if (
      previouslySaving &&
      !isSaving &&
      !hasUnsavedChanges &&
      !saveError &&
      !lastSaved &&
      hasContentChanges &&
      !showTemporarySaved && // don't retrigger if already showing
      !timerRef.current // don't retrigger if timer is already active
    ) {
      setShowTemporarySaved(true);
    }
    
    setPreviouslySaving(isSaving);
  }, [isSaving, hasUnsavedChanges, saveError, lastSaved, previouslySaving, hasContentChanges, showTemporarySaved]);

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

  // Don't show indicators if changes are only column-related, unless we're flashing "Saved"
  // Allow teammate editing indicator to show regardless
  if (!hasContentChanges && !showTemporarySaved && !showSaved && !isTeammateEditing) {
    return null;
  }

  // Show teammate editing state if teammates are making changes (suppress in mobile)
  if (isTeammateEditing && !isMobile) {
    const displayText = activeTeammateNames.length > 0 
      ? `${activeTeammateNames.join(', ')} ${activeTeammateNames.length === 1 ? 'is' : 'are'} editing...`
      : 'Teammate editing...';
      
    return (
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs ml-2">
        <Users className="h-4 w-4" />
        <span>{displayText}</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs ml-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{isLongSave ? 'Still saving...' : 'Saving...'}</span>
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