import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Printer } from 'lucide-react';
import { handleSharedRundownPrint } from '@/utils/sharedRundownPrint';

interface Column {
  id: string;
  name: string;
  key: string;
  width?: string;
  isCustom?: boolean;
  isEditable?: boolean;
  isVisible?: boolean;
}

interface SharedRundownPrintDialogProps {
  title: string;
  items: any[];
  columns: Column[];
  isDark: boolean;
}

export const SharedRundownPrintDialog = ({ 
  title, 
  items, 
  columns, 
  isDark 
}: SharedRundownPrintDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // Initialize with all visible columns selected
  useEffect(() => {
    const visibleColumnIds = columns.filter(col => col.isVisible !== false).map(col => col.id);
    setSelectedColumns(visibleColumnIds);
  }, [columns]);

  const handleColumnToggle = (columnId: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleSelectAll = () => {
    const allColumnIds = columns.map(col => col.id);
    setSelectedColumns(allColumnIds);
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
  };

  const handlePrint = () => {
    handleSharedRundownPrint(title, items, selectedColumns);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`${
            isDark 
              ? 'border-gray-600 hover:bg-gray-700' 
              : 'border-gray-300 hover:bg-gray-100'
          }`}
        >
          <Printer className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Columns to Print</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex justify-between mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSelectAll}
              disabled={selectedColumns.length === columns.length}
            >
              Select All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDeselectAll}
              disabled={selectedColumns.length === 0}
            >
              Deselect All
            </Button>
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={selectedColumns.includes(column.id)}
                  onCheckedChange={() => handleColumnToggle(column.id)}
                />
                <label 
                  htmlFor={column.id} 
                  className="text-sm cursor-pointer flex-1"
                >
                  {column.name}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handlePrint}
            disabled={selectedColumns.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};