import React, { useState, useCallback, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnEditorProps {
  onAddColumn: (name: string) => void;
}

const ColumnEditor = React.memo(({ onAddColumn }: ColumnEditorProps) => {
  const [newColumnName, setNewColumnName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddColumn = useCallback(() => {
    console.log('ColumnEditor handleAddColumn called with:', newColumnName);
    if (newColumnName.trim()) {
      onAddColumn(newColumnName.trim());
      setNewColumnName('');
      // Keep focus on input after adding
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  }, [newColumnName, onAddColumn]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddColumn();
    }
  }, [handleAddColumn]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewColumnName(e.target.value);
  }, []);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Add New Column</h3>
      <div className="flex space-x-2">
        <input
          ref={inputRef}
          type="text"
          value={newColumnName}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Column name"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <Button onClick={handleAddColumn} size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if onAddColumn reference changes
  return prevProps.onAddColumn === nextProps.onAddColumn;
});

ColumnEditor.displayName = 'ColumnEditor';

export default ColumnEditor;
