
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { exportToCSV, importFromCSV, downloadCSV } from '@/utils/csvUtils';

interface UseCSVOperationsProps {
  items: RundownItem[];
  columns: Column[];
  onImportItems: (items: RundownItem[], newColumns: Column[]) => void;
  rundownTitle?: string;
}

export const useCSVOperations = ({
  items,
  columns,
  onImportItems,
  rundownTitle = 'rundown'
}: UseCSVOperationsProps) => {
  const { toast } = useToast();

  const handleExport = useCallback(() => {
    try {
      if (items.length === 0) {
        toast({
          title: 'Export failed',
          description: 'No data to export. Add some segments first.',
          variant: 'destructive'
        });
        return;
      }

      const csvContent = exportToCSV(items, columns);
      const filename = `${rundownTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      
      downloadCSV(csvContent, filename);
      
      toast({
        title: 'Export successful',
        description: `Exported ${items.length} items to ${filename}`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    }
  }, [items, columns, rundownTitle, toast]);

  const handleImport = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string;
        const { items: importedItems, newColumns, errors } = importFromCSV(csvContent, columns);
        
        if (errors.length > 0) {
          toast({
            title: 'Import warnings',
            description: errors.join('; '),
            variant: 'destructive'
          });
        }
        
        if (importedItems.length === 0) {
          toast({
            title: 'Import failed',
            description: 'No valid data found in the CSV file',
            variant: 'destructive'
          });
          return;
        }

        onImportItems(importedItems, newColumns);
        
        const newColumnsCount = newColumns.length;
        const message = newColumnsCount > 0 
          ? `Imported ${importedItems.length} items and created ${newColumnsCount} new columns`
          : `Imported ${importedItems.length} items`;
          
        toast({
          title: 'Import successful',
          description: message
        });
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: 'Import failed',
          description: error instanceof Error ? error.message : 'Failed to parse CSV file',
          variant: 'destructive'
        });
      }
    };
    
    reader.onerror = () => {
      toast({
        title: 'Import failed',
        description: 'Failed to read the file',
        variant: 'destructive'
      });
    };
    
    reader.readAsText(file);
  }, [columns, onImportItems, toast]);

  return {
    handleExport,
    handleImport
  };
};
