import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit, Check, X } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast"
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateRundownTitle } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2 } from "lucide-react"
import HeaderControls from './header/HeaderControls';
import { Column } from '@/hooks/useColumnsManager';
import { RundownItem } from '@/hooks/useRundownItems';

interface RundownHeaderSectionProps {
  rundownTitle: string;
  onTitleChange: (title: string) => void;
  rundownStartTime: string;
  onRundownStartTimeChange: (startTime: string) => void;
  rundownId?: string;
  totalRuntime: string;
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  onOpenTeleprompter: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  isConnected?: boolean;
  isProcessingRealtimeUpdate?: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  showColumnManager: boolean;
  setShowColumnManager: (show: boolean) => void;
  columns: Column[];
  handleAddColumn: (name: string) => void;
  handleReorderColumns: (columns: Column[]) => void;
  handleDeleteColumnWithCleanup: (columnId: string) => void;
  handleRenameColumn: (columnId: string, newName: string) => void;
  handleToggleColumnVisibility: (columnId: string) => void;
  handleLoadLayout: (layoutColumns: Column[]) => void;
  items: RundownItem[];
  onUpdateItem: (id: string, field: string, value: string) => void;
}

const RundownHeaderSection = ({
  rundownTitle,
  onTitleChange,
  rundownStartTime,
  onRundownStartTimeChange,
  rundownId,
  totalRuntime,
  currentTime,
  timezone,
  onTimezoneChange,
  onOpenTeleprompter,
  onUndo,
  canUndo,
  lastAction,
  isConnected,
  isProcessingRealtimeUpdate,
  hasUnsavedChanges,
  isSaving,
  showColumnManager,
  setShowColumnManager,
  columns,
  handleAddColumn,
  handleReorderColumns,
  handleDeleteColumnWithCleanup,
  handleRenameColumn,
  handleToggleColumnVisibility,
  handleLoadLayout,
  items,
  onUpdateItem
}: RundownHeaderSectionProps) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(rundownTitle);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const debouncedTitle = useDebounce(tempTitle, 500);

  const mutation = useMutation(updateRundownTitle, {
    onSuccess: () => {
      queryClient.invalidateQueries(['rundown', rundownId]);
      toast({
        title: "Title updated",
        description: "The rundown title has been successfully updated.",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update title",
        description: error.message || "Something went wrong. Please try again.",
      })
    },
    onSettled: () => {
      setEditingTitle(false);
    }
  });

  const handleTitleDoubleClick = () => {
    setEditingTitle(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempTitle(e.target.value);
  };

  const handleTitleSave = async () => {
    if (rundownId) {
      mutation.mutate({ rundownId, title: debouncedTitle });
    }
  };

  const handleTitleCancel = () => {
    setTempTitle(rundownTitle);
    setEditingTitle(false);
  };

  React.useEffect(() => {
    if (debouncedTitle !== rundownTitle) {
      handleTitleSave();
      onTitleChange(debouncedTitle);
    }
  }, [debouncedTitle, rundownTitle, onTitleChange]);

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
      {/* Top Section with Title and Toolbar */}
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Title Section */}
        <div className="flex items-center">
          {editingTitle ? (
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                value={tempTitle}
                onChange={handleTitleChange}
                className="text-lg font-semibold dark:bg-gray-700 dark:text-white"
                onBlur={handleTitleCancel}
                autoFocus
              />
              {mutation.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Button variant="ghost" size="sm" onClick={handleTitleSave}>
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleTitleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1
              className="text-lg font-semibold cursor-pointer dark:text-white"
              onDoubleClick={handleTitleDoubleClick}
              title="Double click to edit"
            >
              {rundownTitle}
              <Button variant="ghost" size="icon" onClick={handleTitleDoubleClick}>
                <Edit className="h-4 w-4 ml-2" />
              </Button>
            </h1>
          )}
        </div>

        {/* Toolbar Section */}
        <div className="flex items-center space-x-4">
          <Button onClick={onOpenTeleprompter} variant="outline" size="sm">
            Open Teleprompter
          </Button>
        </div>
      </div>
      
      {/* Header Controls Section */}
      <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Total Runtime: {totalRuntime}
            </span>
          </div>
          <HeaderControls
            currentTime={currentTime}
            timezone={timezone}
            onTimezoneChange={onTimezoneChange}
            onUndo={onUndo}
            canUndo={canUndo}
            lastAction={lastAction}
            items={items}
            onUpdateItem={onUpdateItem}
          />
        </div>
      </div>
    </div>
  );
};

export default RundownHeaderSection;
