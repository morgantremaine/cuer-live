
import React from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, FileText, Eye, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ToolsMenuProps {
  rundownId: string | undefined;
  rundownTitle?: string;
}

const ToolsMenu = ({ rundownId, rundownTitle }: ToolsMenuProps) => {
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
        title: "Cannot open AD view",
        description: "Save this rundown first before opening AD view.",
        variant: "destructive"
      });
      return;
    }

    // Open AD view in a new window
    const adViewUrl = `${window.location.origin}/ad-view/${rundownId}`;
    window.open(adViewUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center space-x-1">
          <Wrench className="h-4 w-4" />
          <span>Tools</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg z-50">
        <DropdownMenuItem onClick={handleOpenTeleprompter} className="cursor-pointer">
          <Monitor className="h-4 w-4 mr-2" />
          Open Teleprompter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenBlueprint} className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2" />
          Open Blueprint
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleOpenADView} className="cursor-pointer">
          <Eye className="h-4 w-4 mr-2" />
          Open AD View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ToolsMenu;
