
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
import { timeToSeconds, secondsToTime } from '@/utils/timeUtils';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
import { useSubscription } from '@/hooks/useSubscription';

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
  const { subscription_tier, access_type } = useSubscription();
  const [copied, setCopied] = useState(false);
  const {
    sharedLayout,
    availableLayouts,
    updateSharedLayout,
    reloadLayouts,
    isLoading
  } = useSharedRundownLayout(rundownId);

  // Check if user is on free tier
  const isFreeUser = (subscription_tier === 'Free' || subscription_tier === null) && 
                    (access_type === 'free' || access_type === 'none');

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

    // Find the actual rundown table to extract its structure - prioritize body table for content
    const existingTable = document.querySelector('table[data-rundown-table="body"]') || document.querySelector('table[data-rundown-table="header"], table[data-rundown-table="main"], .table-container table, .rundown-container table');
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
    
    // Calculate total runtime from DOM
    function calculateTotalRuntime() {
      // Look for the runtime text in the header
      const runtimeTexts = document.querySelectorAll('*');
      for (const element of runtimeTexts) {
        const text = element.textContent?.trim();
        if (text && text.includes('Runtime:') && text.includes(':')) {
          const match = text.match(/Runtime:\s*(\d{2}:\d{2}:\d{2})/);
          if (match) {
            return match[1];
          }
        }
      }
      
      // Fallback: calculate from actual duration inputs in the table
      if (rundownData?.items) {
        const totalSeconds = rundownData.items.reduce((total, item) => {
          if (item.duration) {
            return total + timeToSeconds(item.duration);
          }
          return total;
        }, 0);
        
        return secondsToTime(totalSeconds);
      }
      
      return '00:00:00';
    }

    // Extract actual table structure and start time - handle split header/body tables
    const headerTable = document.querySelector('table[data-rundown-table="header"]');
    const bodyTable = document.querySelector('table[data-rundown-table="body"]') || existingTable;
    
    const headerRow = headerTable?.querySelector('thead tr') || existingTable.querySelector('thead tr');
    const bodyRows = bodyTable?.querySelectorAll('tbody tr') || existingTable.querySelectorAll('tbody tr');
    
    // Get start time from the actual rundown header
    function getStartTime() {
      // Look for the start time input in the rundown header (placeholder = HH:MM:SS)
      const startTimeInputs = document.querySelectorAll('input[type="text"]');
      for (const input of startTimeInputs) {
        const htmlInput = input as HTMLInputElement;
        if (htmlInput.placeholder === 'HH:MM:SS' && htmlInput.value) {
          return htmlInput.value;
        }
      }
      
      return '00:00:00';
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
        
        // For header rows, extract duration from appropriate source
        if (dataType === 'header') {
          // Check if this is a duration column
          const headerText = headerCells[cellIndex]?.textContent?.toLowerCase() || '';
          if (headerText.includes('duration') || headerText.includes('dur')) {
            // First try to get duration from the current duration column (which has print-only span)
            let foundContent = false;
            
            // Look for print-only content in the current duration cell
            const printOnlySpan = cellElement.querySelector('.print\\:inline-block, [class*="print:inline-block"]');
            if (printOnlySpan && printOnlySpan.textContent) {
              const spanText = printOnlySpan.textContent.trim();
              if (spanText && spanText.match(/\d{2}:\d{2}:\d{2}/)) {
                content = spanText;
                foundContent = true;
                console.log('Found header duration in duration column:', spanText);
              }
            }
            
            // Fallback: extract duration from header name in first column
            if (!foundContent) {
              const headerRow = cellElement.closest('tr');
              const firstCell = headerRow?.querySelector('td:first-child, th:first-child');
              
              if (firstCell) {
                const firstCellText = firstCell.textContent || '';
                console.log('Header first cell text:', firstCellText);
                
                // Look for duration pattern like "(01:23:45)" in the header name cell
                const durationMatch = firstCellText.match(/\((\d{2}:\d{2}:\d{2})\)/);
                if (durationMatch) {
                  console.log('Found header duration in first cell:', durationMatch[1]);
                  content = durationMatch[1];
                } else {
                  console.log('No duration found in header text, defaulting to 00:00:00');
                  content = '00:00:00';
                }
              } else {
                console.log('Could not find first cell for header duration');
                content = '00:00:00';
              }
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
          border-left: none !important;
          border-right: none !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
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
    // Block for free tier users
    if (isFreeUser) {
      toast({
        title: "Upgrade Required",
        description: "CSV Export is only available to Pro and Premium users. Upgrade your plan in Account Settings to unlock unlimited access.",
        variant: "destructive"
      });
      return;
    }

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
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print/PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
