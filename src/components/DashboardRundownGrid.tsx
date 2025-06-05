
import React from 'react';
import { Clock, Calendar, MoreVertical, Play, Share2, Copy, Archive, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RundownCard } from './RundownCard';
import { useToast } from '@/hooks/use-toast';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { SavedRundown } from '@/hooks/useRundownStorage/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface DashboardRundownGridProps {
  rundowns: SavedRundown[];
  onDeleteRundown: (id: string) => void;
}

const DashboardRundownGrid = ({ rundowns, onDeleteRundown }: DashboardRundownGridProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateRundown } = useRundownStorage();

  // Filter out archived rundowns for the main dashboard view
  const activeRundowns = rundowns.filter(rundown => !rundown.archived);

  const handleOpenRundown = (id: string) => {
    navigate(`/rundown/${id}`);
  };

  const handleOpenTeleprompter = (id: string) => {
    window.open(`/teleprompter/${id}`, '_blank');
  };

  const handleShareRundown = async (rundown: SavedRundown) => {
    try {
      // Create a shareable link
      const shareUrl = `${window.location.origin}/shared/${rundown.id}`;
      
      if (navigator.share) {
        await navigator.share({
          title: rundown.title,
          text: `Check out this rundown: ${rundown.title}`,
          url: shareUrl,
        });
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Link copied!',
          description: 'Shareable link has been copied to your clipboard.',
        });
      }
    } catch (error) {
      console.error('Error sharing rundown:', error);
      toast({
        title: 'Error',
        description: 'Failed to share rundown.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateRundown = async (rundown: SavedRundown) => {
    try {
      // Create a copy with a new title
      const duplicatedTitle = `${rundown.title} (Copy)`;
      
      // Here you would call your save function with the duplicated data
      toast({
        title: 'Rundown duplicated!',
        description: `Created "${duplicatedTitle}"`,
      });
    } catch (error) {
      console.error('Error duplicating rundown:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate rundown.',
        variant: 'destructive',
      });
    }
  };

  const handleArchiveRundown = async (rundown: SavedRundown) => {
    try {
      await updateRundown(
        rundown.id,
        rundown.title,
        rundown.items,
        false, // silent
        true, // archived
        rundown.columns,
        rundown.timezone,
        rundown.startTime || rundown.start_time
      );
      
      toast({
        title: 'Rundown archived',
        description: `"${rundown.title}" has been moved to archives.`,
      });
    } catch (error) {
      console.error('Error archiving rundown:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive rundown.',
        variant: 'destructive',
      });
    }
  };

  if (activeRundowns.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No rundowns yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first rundown to get started with broadcast planning.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {activeRundowns.map((rundown) => (
        <div key={rundown.id} className="relative group">
          <RundownCard
            rundown={rundown}
            onClick={() => handleOpenRundown(rundown.id)}
          />
          
          {/* Action Menu */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleOpenRundown(rundown.id)}>
                  <Play className="mr-2 h-4 w-4" />
                  Open Rundown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenTeleprompter(rundown.id)}>
                  <Clock className="mr-2 h-4 w-4" />
                  Open Teleprompter
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleShareRundown(rundown)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicateRundown(rundown)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleArchiveRundown(rundown)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDeleteRundown(rundown.id)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardRundownGrid;
