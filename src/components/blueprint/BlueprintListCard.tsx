import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Copy, Edit2, Check, X } from 'lucide-react';
import { BlueprintList } from '@/types/blueprint';
import { useToast } from '@/hooks/use-toast';

interface BlueprintListCardProps {
  list: BlueprintList;
  onDelete: (listId: string) => void;
  onRename: (listId: string, newName: string) => void;
}

const BlueprintListCard = ({ list, onDelete, onRename }: BlueprintListCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    const text = list.items.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard!",
        description: `${list.name} has been copied to your clipboard.`,
        variant: "default"
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Copied to clipboard!",
        description: `${list.name} has been copied to your clipboard.`,
        variant: "default"
      });
    }
  };

  const handleRename = () => {
    if (editName.trim() && editName !== list.name) {
      onRename(list.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(list.name);
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
    <Card className="h-fit bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
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
              <CardTitle className="text-lg text-white">{list.name}</CardTitle>
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
                  onClick={copyToClipboard}
                  className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(list.id)}
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
            From: {list.sourceColumn} • {list.items.length} items
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {list.items.length === 0 ? (
            <p className="text-gray-500 italic">No items found</p>
          ) : (
            list.items.map((item, index) => (
              <div
                key={index}
                className="p-2 bg-gray-700 rounded text-sm border border-gray-600 text-gray-200"
              >
                {item}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BlueprintListCard;
