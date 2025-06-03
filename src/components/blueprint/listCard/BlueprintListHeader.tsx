
import React, { useState } from 'react';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2, Check, X, GripVertical, Copy, Trash2 } from 'lucide-react';

interface BlueprintListHeaderProps {
  listName: string;
  sourceColumn: string;
  itemCount: number;
  onRename: (newName: string) => void;
  onCopy: () => void;
  onDelete: () => void;
}

const BlueprintListHeader = ({ 
  listName, 
  sourceColumn, 
  itemCount, 
  onRename, 
  onCopy, 
  onDelete 
}: BlueprintListHeaderProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(listName);

  const handleRename = () => {
    if (editName.trim() && editName !== listName) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(listName);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1 mr-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyPress}
              className="text-lg bg-gray-700 border-gray-600 text-white"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRename}
              className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-900/50"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancelEdit}
              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <GripVertical className="h-5 w-5 text-gray-400 cursor-grab active:cursor-grabbing" />
              <CardTitle className="text-lg text-white">{listName}</CardTitle>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
                title="Rename list"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCopy}
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/50"
                title="Delete list"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
      {!isEditing && (
        <p className="text-sm text-gray-400">
          From: {sourceColumn} • {itemCount} items
        </p>
      )}
    </>
  );
};

export default BlueprintListHeader;
