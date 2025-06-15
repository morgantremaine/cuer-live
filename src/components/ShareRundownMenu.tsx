
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
import { Share2, Layout, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSharedRundownLayout } from '@/hooks/useSharedRundownLayout';

interface ShareRundownMenuProps {
  rundownId: string;
  rundownTitle: string;
}

export const ShareRundownMenu: React.FC<ShareRundownMenuProps> = ({
  rundownId,
  rundownTitle
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const {
    sharedLayout,
    availableLayouts,
    updateSharedLayout
  } = useSharedRundownLayout(rundownId);

  const baseUrl = `${window.location.origin}/shared/rundown/${rundownId}`;

  const copyToClipboard = async (url: string, type: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(type);
      toast({
        title: 'Link copied!',
        description: `Shared rundown link copied to clipboard`,
      });
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive',
      });
    }
  };

  const handleShareCurrentView = () => {
    const url = sharedLayout?.layout_id 
      ? `${baseUrl}?layout=${sharedLayout.layout_id}`
      : baseUrl;
    copyToClipboard(url, 'current');
  };

  const handleShareWithLayout = async (layoutId: string | null, layoutName: string) => {
    await updateSharedLayout(layoutId);
    const url = layoutId ? `${baseUrl}?layout=${layoutId}` : baseUrl;
    copyToClipboard(url, `layout-${layoutId}`);
  };

  const getCurrentLayoutName = () => {
    if (!sharedLayout?.layout_id) return 'Default Layout';
    const layout = availableLayouts.find(l => l.id === sharedLayout.layout_id);
    return layout?.name || 'Unknown Layout';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleShareCurrentView}>
          <Copy className="h-4 w-4 mr-2" />
          Share Current View
          {copied === 'current' && <Check className="h-4 w-4 ml-auto text-green-600" />}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Layout className="h-4 w-4 mr-2" />
            Share with Layout...
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Current: {getCurrentLayoutName()}
            </div>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => handleShareWithLayout(null, 'Default Layout')}>
              <span className="mr-2">📋</span>
              Default Layout
              {copied === 'layout-null' && <Check className="h-4 w-4 ml-auto text-green-600" />}
            </DropdownMenuItem>
            
            {availableLayouts.map((layout) => (
              <DropdownMenuItem
                key={layout.id}
                onClick={() => handleShareWithLayout(layout.id, layout.name)}
              >
                <span className="mr-2">💾</span>
                {layout.name}
                {copied === `layout-${layout.id}` && <Check className="h-4 w-4 ml-auto text-green-600" />}
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
