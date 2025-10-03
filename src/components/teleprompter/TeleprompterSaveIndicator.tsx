
import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveError: string | null;
}

interface TeleprompterSaveIndicatorProps {
  saveState: SaveState;
}

const TeleprompterSaveIndicator = ({ saveState }: TeleprompterSaveIndicatorProps) => {
  const { isSaving, lastSaved, hasUnsavedChanges, saveError } = saveState;
  const [showSaved, setShowSaved] = useState(false);
  const [isLongSave, setIsLongSave] = useState(false);

  // Show saved indicator for 3 seconds after save
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

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-blue-400 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{isLongSave ? 'Still saving...' : 'Saving...'}</span>
      </div>
    );
  }

  if (saveError) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>Save failed</span>
      </div>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <div className="flex items-center gap-2 text-yellow-400 text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>Unsaved changes</span>
      </div>
    );
  }

  if (showSaved && lastSaved) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <CheckCircle className="h-4 w-4" />
        <span>Saved {formatLastSaved(lastSaved)}</span>
      </div>
    );
  }

  return null;
};

export default TeleprompterSaveIndicator;
