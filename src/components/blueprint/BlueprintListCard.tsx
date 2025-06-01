
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, Copy } from 'lucide-react';
import { BlueprintList } from '@/types/blueprint';

interface BlueprintListCardProps {
  list: BlueprintList;
  onDelete: (listId: string) => void;
  onRefresh: (listId: string) => void;
}

const BlueprintListCard = ({ list, onDelete, onRefresh }: BlueprintListCardProps) => {
  const copyToClipboard = async () => {
    const text = list.items.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{list.name}</CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRefresh(list.id)}
              className="h-8 w-8"
              title="Refresh list"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyToClipboard}
              className="h-8 w-8"
              title="Copy to clipboard"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(list.id)}
              className="h-8 w-8 text-red-600 hover:text-red-700"
              title="Delete list"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          From: {list.sourceColumn} • {list.items.length} items
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {list.items.length === 0 ? (
            <p className="text-gray-500 italic">No items found</p>
          ) : (
            list.items.map((item, index) => (
              <div
                key={index}
                className="p-2 bg-gray-50 rounded text-sm border"
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
