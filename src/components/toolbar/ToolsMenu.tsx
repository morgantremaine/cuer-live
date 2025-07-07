
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Wrench, Monitor, FileText, Camera, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';

interface ToolsMenuProps {
  rundownId: string | undefined;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onShowFindReplace?: () => void;
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({
  rundownId,
  size = 'sm',
  className = '',
  onShowFindReplace
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleOpenBlueprint = () => {
    if (!rundownId) {
      toast({
        title: "Cannot open blueprint",
        description: "Save this rundown first before opening blueprint.",
        variant: "destructive"
      });
      return;
    }

    // Check if this is the demo rundown
    if (rundownId === DEMO_RUNDOWN_ID) {
      toast({
        title: "Subscribe to unlock full features",
        description: "Blueprint mode is available with a subscription. Try the full experience!",
        variant: "default"
      });
      return;
    }

    navigate(`/blueprint/${rundownId}`);
  };

  const handleOpenTeleprompter = () => {
    if (!rundownId) {
      toast({
        title: "Cannot open teleprompter",
        description: "Save this rundown first before opening teleprompter.",
        variant: "destructive"
      });
      return;
    }

    // Check if this is the demo rundown
    if (rundownId === DEMO_RUNDOWN_ID) {
      toast({
        title: "Subscribe to unlock full features",
        description: "Teleprompter mode is available with a subscription. Try the full experience!",
        variant: "default"
      });
      return;
    }

    // Open teleprompter in a new window
    const teleprompterUrl = `${window.location.origin}/teleprompter/${rundownId}`;
    window.open(teleprompterUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenADView = () => {
    if (!rundownId) {
      toast({
        title: "Cannot open AD View",
        description: "Save this rundown first before opening AD View.",
        variant: "destructive"
      });
      return;
    }

    // Check if this is the demo rundown
    if (rundownId === DEMO_RUNDOWN_ID) {
      toast({
        title: "Subscribe to unlock full features",
        description: "AD View is available with a subscription. Try the full experience!",
        variant: "default"
      });
      return;
    }

    const adViewUrl = `${window.location.origin}/ad-view/${rundownId}`;
    window.open(adViewUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className={`flex items-center space-x-1 ${className}`}>
          <Wrench className="h-4 w-4" />
          <span>Tools</span>
      </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {onShowFindReplace && (
          <>
            <DropdownMenuItem onClick={onShowFindReplace}>
              <Search className="h-4 w-4 mr-2" />
              Find & Replace
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem onClick={handleOpenTeleprompter}>
          <Monitor className="h-4 w-4 mr-2" />
          Teleprompter
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleOpenBlueprint}>
          <FileText className="h-4 w-4 mr-2" />
          Blueprint
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleOpenADView}>
          <Camera className="h-4 w-4 mr-2" />
          AD View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
