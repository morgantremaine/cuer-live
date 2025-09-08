
import React, { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RundownSaveIndicator from './RundownSaveIndicator';

interface HeaderTitleProps {
  title: string;
  onTitleChange: (title: string) => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  lastSaved?: Date | null;
  saveError?: string | null;
}

const HeaderTitle = ({ title, onTitleChange, hasUnsavedChanges, isSaving, lastSaved, saveError }: HeaderTitleProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  const saveState = {
    isSaving,
    hasUnsavedChanges,
    lastSaved: lastSaved || null,
    saveError: saveError || null
  };

  if (isEditingTitle) {
    return (
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onBlur={handleTitleSubmit}
        onKeyDown={handleKeyDown}
        className="text-xl font-bold bg-transparent border-b-2 border-gray-400 dark:border-gray-500 outline-none text-gray-900 dark:text-white placeholder-gray-500"
        autoFocus
      />
    );
  }

  return (
    <div className="flex items-center space-x-2 group">
      <h1 className="text-xl font-bold">{title}</h1>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsEditingTitle(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Edit2 className="h-4 w-4" />
      </Button>
      <RundownSaveIndicator saveState={saveState} />
    </div>
  );
};

export default HeaderTitle;
