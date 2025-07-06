
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Wrench, Monitor, FileText, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ToolsMenuProps {
  rundownId: string | undefined;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({
  rundownId,
  size = 'sm',
  className = ''
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
