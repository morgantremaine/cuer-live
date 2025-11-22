
import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { getUsedColors } from '@/utils/blueprintUtils';
import { RundownItem } from '@/types/rundown';

interface AddListDialogProps {
  availableColumns: { name: string; value: string }[];
  rundownItems: RundownItem[];
  onAddList: (name: string, sourceColumn: string) => void;
}

const AddListDialog = ({ availableColumns, rundownItems, onAddList }: AddListDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [sourceColumn, setSourceColumn] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && sourceColumn) {
      onAddList(name.trim(), sourceColumn);
      setName('');
      setSourceColumn('');
      setOpen(false);
    }
  };

  // Show all meaningful columns including custom ones
  const meaningfulColumns = availableColumns.filter(column => 
    column.value && (
      ['headers', 'gfx', 'video', 'talent', 'script', 'notes'].includes(column.value) ||
      column.value.startsWith('custom_')
    )
  );

  // Get color-based options
  const colorColumns = useMemo(() => getUsedColors(rundownItems), [rundownItems]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:border-gray-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New List
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-600 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Asset List</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="list-name" className="text-gray-300">List Name</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Props List"
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
              required
            />
          </div>
          <div>
            <Label htmlFor="source-column" className="text-gray-300">Source Column</Label>
            <Select value={sourceColumn} onValueChange={setSourceColumn} required>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white focus:border-gray-500">
                <SelectValue placeholder="Select a column" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {meaningfulColumns.length > 0 && (
                  <>
                    {meaningfulColumns.map((column) => (
                      <SelectItem 
                        key={column.value} 
                        value={column.value}
                        className="text-white hover:bg-gray-700 focus:bg-gray-700 hover:text-white focus:text-white"
                      >
                        {column.name}
                      </SelectItem>
                    ))}
                  </>
                )}
                {colorColumns.length > 0 && (
                  <>
                    {meaningfulColumns.length > 0 && (
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 border-t border-gray-700 mt-1">
                        Color-Based Lists
                      </div>
                    )}
                    {colorColumns.map((column) => (
                      <SelectItem 
                        key={column.value} 
                        value={column.value}
                        className="text-white hover:bg-gray-700 focus:bg-gray-700 hover:text-white focus:text-white"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border border-gray-600"
                            style={{ backgroundColor: column.value.replace('color_', '') }}
                          />
                          <span>{column.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="bg-gray-600 hover:bg-gray-500 text-white border-gray-500"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || !sourceColumn}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white"
            >
              Create List
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddListDialog;
