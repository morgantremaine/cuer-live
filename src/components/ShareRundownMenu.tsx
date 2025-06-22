
import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Link, Download, Layout, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportRundownAsCSV, CSVExportData } from '@/utils/csvExport';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ShareRundownMenuProps {
  rundownId: string;
  rundownTitle?: string;
  rundownData?: CSVExportData;
}

export const ShareRundownMenu = ({ rundownId, rundownTitle = 'Untitled Rundown', rundownData }: ShareRundownMenuProps) => {
  const { toast } = useToast();

  const handleCopyShareableLink = async () => {
    const shareableUrl = `${window.location.origin}/shared-rundown/${rundownId}`;
    
    try {
      await navigator.clipboard.writeText(shareableUrl);
      toast({
        title: "Link copied!",
        description: "Shareable link has been copied to your clipboard.",
      });
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast({
        title: "Failed to copy link",
        description: "Please copy the link manually from the address bar.",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    if (!rundownData) {
      toast({
        title: "Cannot export CSV",
        description: "No rundown data available for export.",
        variant: "destructive"
      });
      return;
    }

    try {
      exportRundownAsCSV(rundownData, rundownTitle);
      toast({
        title: "CSV exported successfully",
        description: `${rundownTitle}.csv has been downloaded.`,
      });
    } catch (error) {
      console.error('CSV export failed:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the CSV file.",
        variant: "destructive"
      });
    }
  };

  const handleManageSharedLayout = () => {
    if (!rundownId) {
      toast({
        title: "Cannot manage layout",
        description: "Save this rundown first before managing shared layout.",
        variant: "destructive"
      });
      return;
    }

    // Open shared layout management in a new window
    const layoutUrl = `${window.location.origin}/shared-layout/${rundownId}`;
    window.open(layoutUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePrintRundown = () => {
    if (!rundownId) {
      toast({
        title: "Cannot print",
        description: "Save this rundown first before printing.",
        variant: "destructive"
      });
      return;
    }

    // Open print view in a new window
    const printUrl = `${window.location.origin}/shared-rundown/${rundownId}?print=true`;
    window.open(printUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center space-x-1">
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg z-50">
        <DropdownMenuItem onClick={handleCopyShareableLink} className="cursor-pointer">
          <Link className="h-4 w-4 mr-2" />
          Copy Shareable Link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
          <Download className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleManageSharedLayout} className="cursor-pointer">
          <Layout className="h-4 w-4 mr-2" />
          Manage Shared Layout
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrintRundown} className="cursor-pointer">
          <Printer className="h-4 w-4 mr-2" />
          Print Rundown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
