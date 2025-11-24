import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Column } from '@/types/columns';
import { useToast } from '@/hooks/use-toast';

interface PrintColumnSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: Column[];
  onPrint: (selectedColumnIndices: number[]) => void;
}

export const PrintColumnSelectionDialog: React.FC<PrintColumnSelectionDialogProps> = ({
  open,
  onOpenChange,
  columns,
  onPrint,
}) => {
  const [selectedColumnIds, setSelectedColumnIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Initialize with all columns selected
  useEffect(() => {
    if (open && columns.length > 0) {
      setSelectedColumnIds(new Set(columns.map(col => col.id)));
    }
  }, [open, columns]);

  const toggleColumn = (columnId: string) => {
    setSelectedColumnIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedColumnIds(new Set(columns.map(col => col.id)));
  };

  const deselectAll = () => {
    setSelectedColumnIds(new Set());
  };

  const handlePrint = () => {
    if (selectedColumnIds.size === 0) {
      toast({
        title: "No columns selected",
        description: "Please select at least one column to print",
        variant: "destructive",
      });
      return;
    }

    // Convert selected column IDs to indices (always include row number column at index 0)
    const selectedIndices = [0]; // Always include row number column
    columns.forEach((col, index) => {
      if (selectedColumnIds.has(col.id)) {
        selectedIndices.push(index + 1); // +1 because row number is at index 0
      }
    });

    onPrint(selectedIndices);
    // Don't close immediately - let parent handle it after print triggers
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Columns to Print</DialogTitle>
          <DialogDescription>
            Choose which columns you want to include in the printed rundown. The row number column will always be included.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="flex-1"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAll}
              className="flex-1"
            >
              Deselect All
            </Button>
          </div>

          <div className="max-h-[400px] overflow-y-auto border rounded-md p-4 space-y-2">
            {columns.map((column) => (
              <label
                key={column.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
              >
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedColumnIds.has(column.id)}
                    onChange={() => toggleColumn(column.id)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                    selectedColumnIds.has(column.id)
                      ? 'bg-primary border-primary'
                      : 'border-input'
                  }`}>
                    {selectedColumnIds.has(column.id) && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                </div>
                <span className="text-sm">{column.name}</span>
              </label>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {selectedColumnIds.size} of {columns.length} columns selected
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePrint}>
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
