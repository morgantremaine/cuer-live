
import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Share2, Layout, Copy, Check, Printer, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSharedRundownLayout } from '@/hooks/useSharedRundownLayout';
import { exportRundownAsCSV, CSVExportData } from '@/utils/csvExport';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';

interface ShareRundownMenuProps {
  rundownId: string;
  rundownTitle: string;
  rundownData?: CSVExportData;
}

export const ShareRundownMenu: React.FC<ShareRundownMenuProps> = ({
  rundownId,
  rundownTitle,
  rundownData
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const {
    sharedLayout,
    availableLayouts,
    updateSharedLayout,
    reloadLayouts,
    isLoading
  } = useSharedRundownLayout(rundownId);

  // Always use the same permanent URL
  const permanentUrl = `${window.location.origin}/shared/rundown/${rundownId}`;

  const copyToClipboard = async () => {
    // Check if this is the demo rundown
    if (rundownId === DEMO_RUNDOWN_ID) {
      toast({
        title: "Subscribe to unlock full features",
        description: "Sharing and read-only links are available with a subscription. Try the full experience!",
        variant: "default"
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(permanentUrl);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: `Shared rundown link copied to clipboard`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    // Check if this is the demo rundown
    if (rundownId === DEMO_RUNDOWN_ID) {
      toast({
        title: "Subscribe to unlock full features",
        description: "Print and export features are available with a subscription. Try the full experience!",
        variant: "default"
      });
      return;
    }

    // Find the actual rundown table to extract its structure
    const existingTable = document.querySelector('table[data-rundown-table="main"], .table-container table, .rundown-container table');
    if (!existingTable) {
      toast({
        title: 'Print failed',
        description: 'Could not find rundown table to print',
        variant: 'destructive',
      });
      return;
    }

    // Create a simplified print-only version
    const printContent = document.createElement('div');
    printContent.id = 'print-only-content';
    printContent.style.display = 'none';
    
    // Calculate total runtime
    function calculateTotalRuntime() {
      if (!rundownData?.items) return '00:00:00';
      
      const totalSeconds = rundownData.items.reduce((total, item) => {
        if (item.duration) {
          const timeMatch = item.duration.match(/(\d+):(\d+):(\d+)/);
          if (timeMatch) {
            return total + parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
          }
        }
        return total;
      }, 0);
      
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Extract actual table structure and start time
    const headerRow = existingTable.querySelector('thead tr');
    const bodyRows = existingTable.querySelectorAll('tbody tr');
    
    // Get start time from the rundown container or first time cell
    function getStartTime() {
      const startTimeElement = document.querySelector('[data-start-time]');
      if (startTimeElement) {
        return startTimeElement.getAttribute('data-start-time') || '';
      }
      
      // Fall back to first time cell in the table
      const firstTimeCell = existingTable.querySelector('tbody tr td input[type="time"], tbody tr td[data-time]');
      if (firstTimeCell) {
        const input = firstTimeCell.querySelector('input') as HTMLInputElement;
        if (input && input.value) {
          return input.value + ':00'; // Add seconds if not present
        }
        return firstTimeCell.textContent?.trim() || '00:00:00';
      }
      
      return rundownData?.items?.[0]?.startTime || '00:00:00';
    }
    
    if (!headerRow || bodyRows.length === 0) {
      toast({
        title: 'Print failed',
        description: 'No rundown content found to print',
        variant: 'destructive',
      });
      return;
    }

    // Build the print HTML using actual table structure
    let printHTML = `
      <div class="print-container">
        <div class="print-header">
          <h1>${rundownTitle}</h1>
          <div class="print-info">
            <span>Start Time: ${getStartTime()}</span>
            <span>Total Runtime: ${calculateTotalRuntime()}</span>
          </div>
        </div>
        <table class="print-table">
          <thead>
            <tr>
    `;

    // Copy header structure
    const headerCells = headerRow.querySelectorAll('th');
    headerCells.forEach(th => {
      const thElement = th as HTMLElement;
      // Get clean header text by looking for direct text or specific elements
      let content = '';
      
      // Try to get text from direct text content first
      const directText = thElement.childNodes[0]?.textContent?.trim();
      if (directText && !directText.includes('undefined')) {
        content = directText;
      } else {
        // Look for span or button elements that contain the actual column name
        const span = thElement.querySelector('span:not(.lucide)');
        const button = thElement.querySelector('button span:not(.lucide)');
        if (span) {
          content = span.textContent?.trim() || '';
        } else if (button) {
          content = button.textContent?.trim() || '';
        } else {
          // Fall back to full text content but clean it
          content = thElement.textContent?.trim() || '';
        }
      }
      
      // Clean up the content
      content = content.replace(/\s+/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      
      // Default to '#' for row number column if empty
      if (!content && headerCells[0] === th) {
        content = '#';
      }
      
      printHTML += `<th>${content || ''}</th>`;
    });

    printHTML += `
            </tr>
          </thead>
          <tbody>
    `;

    // Copy body structure with proper styling
    bodyRows.forEach(row => {
      const rowElement = row as HTMLElement;
      const dataType = rowElement.getAttribute('data-type');
      const customColor = rowElement.getAttribute('data-custom-color') === 'true';
      const isFloated = rowElement.getAttribute('data-floated') === 'true';
      
      let rowClass = 'regular-row';
      let backgroundColor = '#ffffff';
      
      if (dataType === 'header') {
        rowClass = 'header-row';
        backgroundColor = '#e8e8e8';
      } else if (customColor) {
        rowClass = 'colored-row';
        backgroundColor = rowElement.style.backgroundColor || '#f0f8ff';
      } else if (isFloated) {
        rowClass = 'floated-row';
        backgroundColor = '#fff8dc';
      }

      printHTML += `<tr class="${rowClass}" style="background-color: ${backgroundColor};">`;
      
      const cells = rowElement.querySelectorAll('td');
      cells.forEach((cell, cellIndex) => {
        const cellElement = cell as HTMLElement;
        
        // Extract clean content from the cell
        let content = '';
        
        // For first cell (row number), look for specific content
        if (cellIndex === 0) {
          const rowNumberSpan = cellElement.querySelector('span');
          if (rowNumberSpan) {
            content = rowNumberSpan.textContent?.trim() || '';
          } else {
            content = cellElement.textContent?.trim() || '';
          }
        } else {
          // For other cells, look for input/textarea values first, then text content
          const input = cellElement.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
          if (input && input.value) {
            content = input.value.trim();
          } else {
            // Get text content but exclude button text and icons
            const clone = cellElement.cloneNode(true) as HTMLElement;
            // Remove all buttons, icons, and interactive elements
            clone.querySelectorAll('button, .lucide, [role="button"]').forEach(el => el.remove());
            content = clone.textContent?.trim() || '';
          }
        }
        
        // For header rows (dataType === 'header'), show duration even if empty in regular rows
        if (dataType === 'header') {
          // Check if this is a duration column and ensure it shows duration for headers
          const headerCellIndex = Array.from(headerCells).findIndex(th => {
            const headerText = th.textContent?.toLowerCase() || '';
            return headerText.includes('duration') || headerText.includes('dur');
          });
          
          if (cellIndex === headerCellIndex && (!content || content === '')) {
            // Get duration from the input or default formatting
            const durationInput = cellElement.querySelector('input[type="text"]') as HTMLInputElement;
            if (durationInput && durationInput.value) {
              content = durationInput.value;
            } else {
              content = '00:00:00'; // Default duration format for headers
            }
          }
        }
        
        // Clean up content by removing extra whitespace and control characters
        content = content.replace(/\s+/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        
        printHTML += `<td>${content}</td>`;
      });
      
      printHTML += `</tr>`;
    });

    printHTML += `
          </tbody>
        </table>
      </div>
    `;

    printContent.innerHTML = printHTML;
    document.body.appendChild(printContent);

    // Add print styles
    const printStyles = document.createElement('style');
    printStyles.id = 'rundown-print-styles';
    printStyles.textContent = `
      @media print {
        @page {
          margin: 0.5in;
          size: auto;
        }

        body * {
          visibility: hidden;
        }

        #print-only-content,
        #print-only-content * {
          visibility: visible !important;
        }

        #print-only-content {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          display: block !important;
        }

        .print-container {
          width: 100% !important;
          background: white !important;
          color: black !important;
        }

        .print-header {
          margin-bottom: 20px !important;
          padding-bottom: 10px !important;
          border-bottom: 2px solid #333 !important;
        }

        .print-header h1 {
          font-size: 24px !important;
          font-weight: bold !important;
          margin: 0 0 10px 0 !important;
          color: black !important;
        }

        .print-info {
          font-size: 12px !important;
          color: #333 !important;
          display: flex !important;
          gap: 30px !important;
        }

        .print-table {
          width: 100% !important;
          border-collapse: collapse !important;
          font-size: 10px !important;
          background: white !important;
          table-layout: auto !important;
        }

        .print-table th {
          background: #f5f5f5 !important;
          border: 1px solid #333 !important;
          padding: 6px 4px !important;
          font-weight: bold !important;
          font-size: 9px !important;
          text-align: left !important;
          color: black !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .print-table td {
          border: 1px solid #666 !important;
          padding: 4px !important;
          vertical-align: top !important;
          word-wrap: break-word !important;
          color: black !important;
          font-size: 9px !important;
          line-height: 1.3 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .header-row td {
          font-weight: bold !important;
          font-size: 11px !important;
          padding: 8px 4px !important;
        }

        /* Preserve custom colors */
        .colored-row td {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .floated-row td {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .regular-row td {
          background: white !important;
        }
      }
    `;

    document.head.appendChild(printStyles);

    // Trigger print
    window.print();

    // Clean up after print
    setTimeout(() => {
      const styles = document.getElementById('rundown-print-styles');
      const content = document.getElementById('print-only-content');
      if (styles) styles.remove();
      if (content) content.remove();
    }, 1000);
  };

  const handleExportCSV = () => {
    // Check if this is the demo rundown
    if (rundownId === DEMO_RUNDOWN_ID) {
      toast({
        title: "Subscribe to unlock full features",
        description: "Print and export features are available with a subscription. Try the full experience!",
        variant: "default"
      });
      return;
    }

    try {
      if (!rundownData) {
        throw new Error('No rundown data available for export');
      }
      
      const sanitizedTitle = rundownTitle.replace(/[^a-zA-Z0-9]/g, '_');
      exportRundownAsCSV(rundownData, sanitizedTitle);
      
      toast({
        title: 'Export successful!',
        description: `${rundownTitle} exported as CSV`,
      });
    } catch (error) {
      console.error('CSV export error:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export rundown',
        variant: 'destructive',
      });
    }
  };

  const handleSetSharedLayout = async (layoutId: string | null, layoutName: string) => {
    await updateSharedLayout(layoutId);
    toast({
      title: 'Shared layout updated!',
      description: `Shared rundown will now display: ${layoutName}`,
    });
  };

  const getCurrentLayoutName = () => {
    if (!sharedLayout || !sharedLayout.layout_id) return 'Default Layout';
    const layout = availableLayouts.find(l => l.id === sharedLayout.layout_id);
    return layout?.name || 'Unknown Layout';
  };

  const isCurrentLayout = (layoutId: string | null) => {
    if (!layoutId && !sharedLayout?.layout_id) return true;
    return sharedLayout?.layout_id === layoutId;
  };

  // Handle layout submenu opening to refresh layouts
  const handleLayoutSubmenuOpen = () => {
    console.log('🔄 Refreshing layouts for shared rundown menu');
    reloadLayouts();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center space-x-1">
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={copyToClipboard}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Read-Only Link
          {copied && <Check className="h-4 w-4 ml-auto text-green-600" />}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print View
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuSub onOpenChange={(open) => open && handleLayoutSubmenuOpen()}>
          <DropdownMenuSubTrigger>
            <Layout className="h-4 w-4 mr-2" />
            Set Read-Only Layout...
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Current: {getCurrentLayoutName()}
            </div>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => handleSetSharedLayout(null, 'Default Layout')}>
              <span className="mr-2">📋</span>
              Default Layout
              {isCurrentLayout(null) && <Check className="h-4 w-4 ml-auto text-green-600" />}
            </DropdownMenuItem>
            
            {availableLayouts.map((layout) => (
              <DropdownMenuItem
                key={layout.id}
                onClick={() => handleSetSharedLayout(layout.id, layout.name)}
              >
                <span className="mr-2">💾</span>
                {layout.name}
                {isCurrentLayout(layout.id) && <Check className="h-4 w-4 ml-auto text-green-600" />}
              </DropdownMenuItem>
            ))}
            
            {availableLayouts.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No saved layouts
              </div>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
