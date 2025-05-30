
import React from 'react';
import { Plus, Settings, Copy, Clipboard, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RundownToolbarProps {
  onAddRow: () => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  selectedCount: number;
  hasClipboardData: boolean;
  onCopySelectedRows: () => void;
  onPasteRows: () => void;
  onDeleteSelectedRows: () => void;
  onClearSelection: () => void;
}

const RundownToolbar = ({
  onAddRow,
  onAddHeader,
  onShowColumnManager,
  selectedCount,
  hasClipboardData,
  onCopySelectedRows,
  onPasteRows,
  onDeleteSelectedRows,
  onClearSelection
}: RundownToolbarProps) => {
  return (
    <div className="p-4 border-b bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
      <div className="flex space-x-2">
        <Button onClick={onAddRow} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Segment</span>
        </Button>
        <Button onClick={onAddHeader} variant="outline" className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Header</span>
        </Button>
        <Button onClick={onShowColumnManager} variant="outline" className="flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <span>Manage Columns</span>
        </Button>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {selectedCount} selected
          </span>
          <Button onClick={onCopySelectedRows} variant="outline" size="sm">
            <Copy className="h-4 w-4" />
          </Button>
          {hasClipboardData && (
            <Button onClick={onPasteRows} variant="outline" size="sm">
              <Clipboard className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={onDeleteSelectedRows} variant="outline" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={onClearSelection} variant="ghost" size="sm">
            Clear
          </Button>
        </div>
      )}
    </div>
  );
};

export default RundownToolbar;
