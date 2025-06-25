
import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Save } from 'lucide-react';

interface SaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveError: string | null;
}

interface TeleprompterSaveIndicatorProps {
  saveState: SaveState;
  onManualSave?: () => void;
}

const TeleprompterSaveIndicator = ({ saveState, onManualSave }: TeleprompterSaveIndicatorProps) => {
  const { isSaving, lastSaved, hasUnsavedChanges, saveError } = saveState;

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
        <span>Saving...</span>
      </div>
    );
  }

  if (saveError) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>Save failed</span>
        {onManualSave && (
          <button
            onClick={onManualSave}
            className="text-blue-400 hover:text-blue-300 underline ml-2"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <div className="flex items-center gap-2 text-yellow-400 text-sm">
        <Save className="h-4 w-4" />
        <span>Unsaved changes</span>
        {onManualSave && (
          <button
            onClick={onManualSave}
            className="text-blue-400 hover:text-blue-300 underline ml-2"
          >
            Save now
          </button>
        )}
      </div>
    );
  }

  if (lastSaved) {
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
