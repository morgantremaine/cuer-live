
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
import { Share2, Layout, Copy, Check, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSharedRundownLayout } from '@/hooks/useSharedRundownLayout';
import { exportRundownAsCSV, CSVExportData } from '@/utils/csvExport';
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
