import React from 'react';
import { Clock, Calendar, MoreVertical, Play, Share2, Copy, Archive, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RundownCard from './RundownCard';
import { useToast } from '@/hooks/use-toast';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { SavedRundown } from '@/hooks/useRundownStorage/types';
import { RundownItem } from '@/hooks/useRundownItems';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface DashboardRundownGridProps {
  title?: string;
  rundowns: SavedRundown[];
  loading?: boolean;
  onCreateNew?: () => void;
  onOpen?: (rundownId: string) => void;
  onDelete?: (rundownId: string, title: string, e: React.MouseEvent) => void;
  onArchive?: (rundownId: string, title: string, e: React.MouseEvent) => void;
  onUnarchive?: (rundownId: string, title: string, items: RundownItem[], e: React.MouseEvent) => void;
  onDuplicate?: (rundownId: string, title: string, items: RundownItem[], e: React.MouseEvent) => void;
  isArchived?: boolean;
  showEmptyState?: boolean;
}

const DashboardRundownGrid = ({ 
  title,
  rundowns, 
  loading = false,
  onCreateNew,
  onOpen,
  onDelete,
  onArchive,
  onUnarchive,
  onDuplicate,
  isArchived = false,
  showEmptyState = true
}: DashboardRundownGridProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateRundown } = useRundownStorage();

  // Filter rundowns based on archived status
  const filteredRundowns = rundowns.filter(rundown => 
    isArchived ? rundown.archived === true : rundown.archived !== true
  );

  const handleOpenRundown = (id: string) => {
    if (onOpen) {
      onOpen(id);
    } else {
      navigate(`/rundown/${id}`);
    }
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

  const handleDuplicateRundown = async (id: string, title: string, items: RundownItem[], e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDuplicate) {
      onDuplicate(id, title, items, e);
    }
  };

  const handleArchiveRundown = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onArchive) {
      onArchive(id, title, e);
    } else {
      const rundown = rundowns.find(r => r.id === id);
      if (rundown) {
        try {
          await updateRundown(
            id,
            title,
            rundown.items,
            false, // silent
            true, // archived
            rundown.columns,
            rundown.timezone,
            rundown.startTime || rundown.start_time
          );
          
          toast({
            title: 'Rundown archived',
            description: `"${title}" has been moved to archives.`,
          });
        } catch (error) {
          console.error('Error archiving rundown:', error);
          toast({
            title: 'Error',
            description: 'Failed to archive rundown.',
            variant: 'destructive',
          });
        }
      }
    }
  };

  const handleUnarchiveRundown = async (id: string, title: string, items: RundownItem[], e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUnarchive) {
      onUnarchive(id, title, items, e);
    }
  };

  const handleDeleteRundown = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id, title, e);
    }
  };

  if (filteredRundowns.length === 0 && showEmptyState) {
    return (
      <div className="mb-8">
        {title && (
          <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
        )}
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {isArchived ? 'No archived rundowns' : 'No rundowns yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {isArchived 
              ? 'Archived rundowns will appear here.' 
              : 'Create your first rundown to get started with broadcast planning.'
            }
          </p>
        </div>
      </div>
    );
  }

  if (filteredRundowns.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      {title && (
        <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRundowns.map((rundown) => (
          <RundownCard
            key={rundown.id}
            rundown={rundown}
            onOpen={handleOpenRundown}
            onDelete={handleDeleteRundown}
            onArchive={isArchived ? undefined : handleArchiveRundown}
            onUnarchive={isArchived ? handleUnarchiveRundown : undefined}
            onDuplicate={handleDuplicateRundown}
            isArchived={isArchived}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardRundownGrid;
