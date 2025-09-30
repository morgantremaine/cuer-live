import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, Users, Edit3 } from 'lucide-react';
import { debugLogger } from '@/utils/debugLogger';

interface SaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveError: string | null;
  hasContentChanges?: boolean; // Additional flag to distinguish content vs column changes
  isTyping?: boolean; // New typing state
  showSaved?: boolean; // New saved flash state
}

interface RundownSaveIndicatorProps {
  saveState: SaveState;
  shouldShowSavedFlash?: boolean;
  isTeammateEditing?: boolean;
  activeTeammateNames?: string[];
  isMobile?: boolean; // Add mobile prop to suppress teammate editing
}

const RundownSaveIndicator = ({ saveState, shouldShowSavedFlash, isTeammateEditing = false, activeTeammateNames = [], isMobile = false }: RundownSaveIndicatorProps) => {
  const { isSaving, lastSaved, hasUnsavedChanges, saveError, hasContentChanges = true, isTyping, showSaved } = saveState;
  const [showTemporarySaved, setShowTemporarySaved] = useState(false);
  const [previouslySaving, setPreviouslySaving] = useState(false);
  
  debugLogger.autosave('RundownSaveIndicator render:', {
    isTeammateEditing,
    isSaving,
    hasUnsavedChanges,
    hasContentChanges,
    showSaved,
    showTemporarySaved,
    shouldShow: !(!hasContentChanges && !shouldShowSavedFlash && !showSaved && !isTeammateEditing)
  });

  // Note: showSaved is now handled by the smart save indicator hook

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
      !showTemporarySaved // don't retrigger if already showing
    ) {
      setShowTemporarySaved(true);
    }
    
    setPreviouslySaving(isSaving);
  }, [isSaving, hasUnsavedChanges, saveError, lastSaved, previouslySaving, hasContentChanges, showTemporarySaved]);

  // External trigger to flash "Saved" (e.g., from parent after content save completes)
  useEffect(() => {
    if (shouldShowSavedFlash) {
      setShowTemporarySaved(true);
    }
  }, [shouldShowSavedFlash]);

  // Centralized timer to hide the temporary saved message after 2 seconds
  useEffect(() => {
    if (showTemporarySaved) {
      const timer = setTimeout(() => setShowTemporarySaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showTemporarySaved]);

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
  if (!hasContentChanges && !showTemporarySaved && !showSaved && !isTeammateEditing && !isTyping) {
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

  // Show typing state (new enhanced state)
  if (isTyping) {
    return (
      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs ml-2">
        <Edit3 className="h-4 w-4" />
        <span>Unsaved changes</span>
      </div>
    );
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

  // Show enhanced "Saved" state (priority over lastSaved)
  if (showSaved) {
    return (
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs ml-2">
        <CheckCircle className="h-4 w-4" />
        <span>Saved</span>
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