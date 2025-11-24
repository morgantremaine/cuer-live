import React, { useState } from 'react';
import { Printer, Table, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CSVExportData } from '@/utils/csvExport';
import { handleSharedRundownPrintWithColumns } from '@/utils/sharedRundownPrint';
import { printRundownScript } from '@/utils/scriptPrint';
import { PrintColumnSelectionDialog } from '@/components/PrintColumnSelectionDialog';

interface PrintRundownMenuProps {
  rundownId: string;
  rundownTitle: string;
  rundownData?: CSVExportData;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export const PrintRundownMenu: React.FC<PrintRundownMenuProps> = ({
  rundownId,
  rundownTitle,
  rundownData,
  size = 'sm',
  className = '',
}) => {
  const [showColumnDialog, setShowColumnDialog] = useState(false);

  const handlePrint = () => {
    // Open the column selection dialog
    setShowColumnDialog(true);
  };

  const handlePrintWithColumns = (selectedColumnIndices: number[]) => {
    if (rundownData?.items) {
      handleSharedRundownPrintWithColumns(rundownTitle, rundownData.items, selectedColumnIndices);
    }
  };

  const handlePrintScript = () => {
    if (rundownData?.items) {
      printRundownScript(rundownTitle, rundownData.items, {
        isUppercase: true,
        showAllSegments: true,
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size={size}
            className={className}
          >
            <Printer className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handlePrint}>
            <Table className="mr-2 h-4 w-4" />
            <span>Print Rundown</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrintScript}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Print Script</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PrintColumnSelectionDialog
        open={showColumnDialog}
        onOpenChange={setShowColumnDialog}
        columns={rundownData?.visibleColumns || []}
        onPrint={handlePrintWithColumns}
      />
    </>
  );
};
