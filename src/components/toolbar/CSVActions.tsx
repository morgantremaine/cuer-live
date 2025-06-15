
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { useCSVOperations } from '@/hooks/useCSVOperations';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface CSVActionsProps {
  items: RundownItem[];
  columns: Column[];
  onImportItems: (items: RundownItem[], newColumns: Column[]) => void;
  rundownTitle?: string;
  isMobile?: boolean;
}

const CSVActions = ({
  items,
  columns,
  onImportItems,
  rundownTitle,
  isMobile = false
}: CSVActionsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { handleExport, handleImport } = useCSVOperations({
    items,
    columns,
    onImportItems,
    rundownTitle
  });

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      handleImport(file);
    } else if (file) {
      // Reset the input
      event.target.value = '';
    }
  };

  const buttonSize = isMobile ? 'sm' : 'default';
  const buttonClass = isMobile ? 'flex items-center space-x-1' : 'flex items-center space-x-2';

  return (
    <>
      <Button 
        onClick={handleExport} 
        variant="outline" 
        size={buttonSize}
        className={buttonClass}
      >
        <Download className="h-4 w-4" />
        <span>{isMobile ? 'Export' : 'Export CSV'}</span>
      </Button>
      
      <Button 
        onClick={handleImportClick} 
        variant="outline" 
        size={buttonSize}
        className={buttonClass}
      >
        <Upload className="h-4 w-4" />
        <span>{isMobile ? 'Import' : 'Import CSV'}</span>
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  );
};

export default CSVActions;
