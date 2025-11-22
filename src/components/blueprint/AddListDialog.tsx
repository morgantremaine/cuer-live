
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
  const [listType, setListType] = useState<'column' | 'color'>('column');
  const [sourceColumn, setSourceColumn] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const source = listType === 'column' ? sourceColumn : selectedColor;
    if (name.trim() && source) {
      onAddList(name.trim(), source);
      setName('');
      setSourceColumn('');
      setSelectedColor('');
      setListType('column');
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
            <Label className="text-gray-300 mb-3 block">List Type</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="listType"
                  value="column"
                  checked={listType === 'column'}
                  onChange={(e) => setListType(e.target.value as 'column' | 'color')}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="text-white">Column-Based</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="listType"
                  value="color"
                  checked={listType === 'color'}
                  onChange={(e) => setListType(e.target.value as 'column' | 'color')}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="text-white">Color-Based</span>
              </label>
            </div>
          </div>

          {listType === 'column' ? (
            <div>
              <Label htmlFor="source-column" className="text-gray-300">Select Column</Label>
              <Select value={sourceColumn} onValueChange={setSourceColumn} required>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white focus:border-gray-500">
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {meaningfulColumns.length > 0 ? (
                    meaningfulColumns.map((column) => (
                      <SelectItem 
                        key={column.value} 
                        value={column.value}
                        className="text-white hover:bg-gray-700 focus:bg-gray-700 hover:text-white focus:text-white"
                      >
                        {column.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-4 text-center text-gray-400 text-sm">
                      No columns available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label className="text-gray-300 mb-2 block">Select Color</Label>
              {colorColumns.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {colorColumns.map((colorOption) => {
                    const colorHex = colorOption.value.replace('color_', '');
                    const isSelected = selectedColor === colorOption.value;
                    return (
                      <button
                        key={colorOption.value}
                        type="button"
                        onClick={() => setSelectedColor(colorOption.value)}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-gray-700'
                            : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded border border-gray-600 flex-shrink-0"
                          style={{ backgroundColor: colorHex }}
                        />
                        <div className="text-left flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">
                            {colorOption.name}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">
                  No colored rows found in this rundown
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
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
              disabled={!name.trim() || (listType === 'column' ? !sourceColumn : !selectedColor)}
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
